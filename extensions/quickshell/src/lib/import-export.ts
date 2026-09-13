import { createStableId, isStableWorkspaceId } from "./ids";
import { migrateStoredData } from "./migration";
import type { LayoutEntry, StoredData, Workspace } from "./schema";
import { SCHEMA_VERSION, createEmptyStoredData } from "./schema";
import { createIngressSecurity } from "./security";

type UnknownRecord = Record<string, unknown>;

/** Mirrors Core import size ceiling (~2 MB). */
export const MAX_IMPORT_PAYLOAD_BYTES = 2 * 1024 * 1024;

export type ImportResult = {
  data: StoredData;
  imported: number;
  skipped: number;
  renamed: number;
};

export type ImportConflictSummary = {
  imported: number;
  renamed: number;
  skipped: number;
  hasConflicts: boolean;
};

export function exportStoredData(data: StoredData): string {
  const portable = { ...data };
  delete portable.workspaceSecurity;
  // Branch targets drive git switch on launch; keep them Raycast-local (not portable).
  delete portable.branchTargets;
  return JSON.stringify(portable, null, 2);
}

export function parseImportPayload(raw: string, existing?: StoredData): ImportResult {
  if (typeof raw !== "string") {
    throw new Error("Import payload must be a JSON string.");
  }
  if (Buffer.byteLength(raw, "utf8") > MAX_IMPORT_PAYLOAD_BYTES) {
    throw new Error("Import payload is too large.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new Error("Import payload is not valid JSON.");
  }
  return importParsedPayload(parsed, existing);
}

/** Dry-run merge counts for conflict confirm UI (does not persist). */
export function summarizeImportConflicts(raw: string, existing: StoredData): ImportConflictSummary {
  const result = parseImportPayload(raw, existing);
  return {
    imported: result.imported,
    renamed: result.renamed,
    skipped: result.skipped,
    hasConflicts: result.renamed > 0 || result.skipped > 0,
  };
}

export function importParsedPayload(parsed: unknown, existing?: StoredData): ImportResult {
  if (Array.isArray(parsed)) {
    return importShortcutArray(parsed, existing);
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Import file must be a JSON object or workspace array.");
  }

  const record = parsed as UnknownRecord;

  if (Array.isArray(record.shortcuts)) {
    return importShortcutArray(record.shortcuts, existing);
  }

  if (Array.isArray(record.workspaces)) {
    const migrated = migrateStoredData(normalizeRecordKeys(record));
    return mergeImportedData(migrated, existing);
  }

  // CmdPal / Core layout envelope: { version, entries: [ shortcut | { Workspace } | separator ] }
  if (Array.isArray(record.entries)) {
    if (typeof record.version === "number" && record.version > SCHEMA_VERSION) {
      throw new Error(`Unsupported Quick Shell data version: ${record.version}`);
    }
    return importCmdPalLayoutEnvelope(record.entries, existing);
  }

  const migrated = migrateStoredData(normalizeRecordKeys(record));
  if (migrated.workspaces.length === 0) {
    throw new Error("No workspaces found in import file.");
  }
  return mergeImportedData(migrated, existing);
}

/**
 * Imports desktop CmdPal/Run layout JSON (`entries`), including flat PascalCase
 * shortcuts and on-disk `{ Workspace, Security }` wrappers. Separators become layout rows.
 */
function importCmdPalLayoutEnvelope(entries: unknown[], existing?: StoredData): ImportResult {
  const workspaces: unknown[] = [];
  const layoutEntries: LayoutEntry[] = [];
  /** Envelope-local IDs so duplicate source IDs do not share one idRemap slot. */
  const usedEnvelopeIds = new Set<string>();

  for (const raw of entries) {
    const entry = normalizeRecordKeys(raw);
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const record = entry as UnknownRecord;
    const type = typeof record.type === "string" ? record.type.trim().toLowerCase() : "";
    if (type === "separator") {
      const title = typeof record.title === "string" && record.title.trim() ? record.title.trim() : null;
      layoutEntries.push({ type: "separator", id: createStableId(), title });
      continue;
    }

    const payload = record.workspace && typeof record.workspace === "object" ? record.workspace : record;
    if (!payload || typeof payload !== "object") {
      continue;
    }
    const workspaceRecord = normalizeRecordKeys(payload) as UnknownRecord;
    const name = typeof workspaceRecord.name === "string" ? workspaceRecord.name.trim() : "";
    const directory = typeof workspaceRecord.directory === "string" ? workspaceRecord.directory.trim() : "";
    if (!name || !directory) {
      continue;
    }

    // Stable id ties layout rows to merge retention so skipped duplicates do not shift later rows.
    // Repeated source IDs get a fresh id so each layout row remaps independently.
    const rawId = typeof workspaceRecord.id === "string" ? workspaceRecord.id.trim() : "";
    let workspaceId = isStableWorkspaceId(rawId) ? rawId.toLowerCase() : createStableId();
    if (usedEnvelopeIds.has(workspaceId)) {
      workspaceId = createStableId();
    }
    usedEnvelopeIds.add(workspaceId);
    workspaces.push({ ...workspaceRecord, id: workspaceId });
    layoutEntries.push({ type: "workspace", workspaceId });
  }

  if (workspaces.length === 0) {
    throw new Error("No workspaces found in import file.");
  }

  const migrated = migrateStoredData({
    version: 1,
    workspaces,
    layoutEntries,
    settings: existing?.settings ?? createEmptyStoredData().settings,
  });
  return mergeImportedData(migrated, existing);
}

function importShortcutArray(items: unknown[], existing?: StoredData): ImportResult {
  const normalizedItems = items
    .map((item) => normalizeRecordKeys(item))
    .filter((item) => {
      if (!item || typeof item !== "object") {
        return false;
      }
      const record = item as UnknownRecord;
      if (record.type === "separator") {
        return false;
      }
      return true;
    });

  const migrated = migrateStoredData({
    version: 1,
    workspaces: normalizedItems,
    settings: existing?.settings ?? createEmptyStoredData().settings,
  });

  return mergeImportedData(migrated, existing);
}

function mergeImportedData(imported: StoredData, existing?: StoredData): ImportResult {
  const base = existing ?? createEmptyStoredData();
  const names = new Set(base.workspaces.map((workspace) => workspace.name.toLowerCase()));
  const ids = new Set(base.workspaces.map((workspace) => workspace.id));
  let renamed = 0;
  let skipped = 0;
  const merged: Workspace[] = [...base.workspaces];
  const idRemap = new Map<string, string>();

  for (const workspace of imported.workspaces) {
    let next = workspace;
    const originalId = workspace.id;
    if (ids.has(workspace.id)) {
      next = { ...next, id: createStableId() };
    }

    if (names.has(next.name.toLowerCase())) {
      const suffixed = `${workspace.name} (imported)`;
      if (names.has(suffixed.toLowerCase())) {
        skipped += 1;
        continue;
      }
      next = { ...next, name: suffixed };
      renamed += 1;
    }

    names.add(next.name.toLowerCase());
    ids.add(next.id);
    idRemap.set(originalId, next.id);
    merged.push(next);
  }

  const isReplace = base.workspaces.length === 0;
  const newlyImported = merged.slice(base.workspaces.length);
  const remappedImportLayout = remapImportedLayout(imported.layoutEntries, idRemap);
  const layoutEntries = isReplace
    ? remappedImportLayout
    : [
        ...(base.layoutEntries ?? []),
        // Prefer remapped imported layout (keeps CmdPal separators). Fall back when the
        // remapped layout has no workspace rows (all skipped, or separators only).
        ...(remappedImportLayout.some((entry) => entry.type === "workspace")
          ? remappedImportLayout
          : newlyImported.map((workspace) => ({ type: "workspace" as const, workspaceId: workspace.id }))),
      ];

  return {
    data: {
      version: imported.version,
      settings: { ...base.settings, ...imported.settings },
      workspaces: merged,
      workspaceSecurity: Object.fromEntries(
        merged.map((workspace) => {
          const existingSecurity = base.workspaceSecurity?.[workspace.id];
          return [
            workspace.id,
            existingSecurity && base.workspaces.some((candidate) => candidate.id === workspace.id)
              ? { ...existingSecurity }
              : createIngressSecurity(),
          ];
        }),
      ),
      // Never adopt imported branchTargets; they auto-switch on launch.
      branchTargets: { ...(base.branchTargets ?? {}) },
      layoutEntries,
    },
    imported: merged.length - base.workspaces.length,
    skipped,
    renamed,
  };
}

function remapImportedLayout(layout: LayoutEntry[] | undefined, idRemap: Map<string, string>): LayoutEntry[] {
  if (!layout) {
    return [];
  }
  const next: LayoutEntry[] = [];
  for (const entry of layout) {
    if (entry.type === "separator") {
      next.push({ type: "separator", id: entry.id, title: entry.title ?? null });
      continue;
    }
    const remapped = idRemap.get(entry.workspaceId);
    if (!remapped) {
      // Skipped during merge (e.g. duplicate name) — omit so later rows do not shift.
      continue;
    }
    next.push({ type: "workspace", workspaceId: remapped });
  }
  return next;
}

function normalizeRecordKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeRecordKeys(item));
  }
  if (!value || typeof value !== "object") {
    return value;
  }

  const record = value as UnknownRecord;
  const normalized: UnknownRecord = {};
  for (const [key, nested] of Object.entries(record)) {
    const normalizedKey = key.length > 0 ? key[0].toLowerCase() + key.slice(1) : key;
    normalized[normalizedKey] = normalizeRecordKeys(nested);
  }
  return normalized;
}
