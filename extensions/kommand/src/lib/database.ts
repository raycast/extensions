/**
 * SQLite access to Kommand's SwiftData database.
 *
 * SwiftData uses CoreData under the hood, so table/column names follow the
 * Z-prefixed convention (ZSHORTCUT, ZTITLE, Z_PK, etc.).
 *
 * The DB lives inside the app's sandbox container:
 *   ~/Library/Containers/com.curiouscode.kommand/Data/Library/Application Support/default.store
 */

import { executeSQL, runAppleScript } from "@raycast/utils";
import { existsSync } from "fs";
import { homedir } from "os";
import { resolve } from "path";
import {
  KommandShortcut,
  ShortcutRow,
  ShortcutRowWithApp,
  ShortcutStep,
} from "./types";

const KOMMAND_BUNDLE_IDENTIFIER = "com.curiouscode.kommand";

/** Path to Kommand's SwiftData SQLite store */
export const DB_PATH = resolve(
  homedir(),
  "Library/Containers/com.curiouscode.kommand/Data/Library/Application Support/default.store",
);

/** Check whether Kommand's shortcut library exists locally */
export function hasKommandLibrary(): boolean {
  return existsSync(DB_PATH);
}

let _kommandAppPathPromise: Promise<string | null> | null = null;

/** Resolve the installed Kommand app via Launch Services, independent of its path */
export async function findKommandAppPath(): Promise<string | null> {
  if (_kommandAppPathPromise) {
    return _kommandAppPathPromise;
  }

  _kommandAppPathPromise = (async () => {
    try {
      const appPath = await runAppleScript(
        `
try
  POSIX path of (path to application id "${KOMMAND_BUNDLE_IDENTIFIER}")
on error
  return ""
end try
`,
      );

      const trimmedPath = appPath.trim();
      return trimmedPath.length > 0 ? trimmedPath : null;
    } catch (error) {
      console.error(
        "Failed to resolve Kommand app via Launch Services:",
        error,
      );
      return null;
    }
  })();

  return _kommandAppPathPromise;
}

// ── Schema detection ────────────────────────────────────────────────────

/** Tracks which optional columns exist on ZSHORTCUT (checked once per process) */
interface SchemaInfo {
  hasGlobal: boolean;
  hasSequenceData: boolean;
}

let _schema: SchemaInfo | null = null;

async function getSchema(): Promise<SchemaInfo> {
  if (_schema) return _schema;
  try {
    const rows = await executeSQL<{ name: string }>(
      DB_PATH,
      `PRAGMA table_info(ZSHORTCUT)`,
    );
    const cols = new Set(rows.map((r) => r.name));
    _schema = {
      hasGlobal: cols.has("ZISGLOBAL"),
      hasSequenceData: cols.has("ZSEQUENCEDATA"),
    };
  } catch {
    _schema = { hasGlobal: false, hasSequenceData: false };
  }
  return _schema;
}

/** SQL fragment for isGlobal — real column or 0 fallback */
function globalSelect(s: SchemaInfo): string {
  return s.hasGlobal
    ? "s.ZISGLOBAL        AS isGlobal"
    : "0                  AS isGlobal";
}

/** SQL fragment for sequenceData — real column or NULL fallback */
function sequenceDataSelect(s: SchemaInfo): string {
  return s.hasSequenceData
    ? "s.ZSEQUENCEDATA    AS sequenceData"
    : "NULL               AS sequenceData";
}

// ── Queries ─────────────────────────────────────────────────────────────

function shortcutsForAppQuery(bundleId: string, s: SchemaInfo): string {
  const escaped = bundleId.replace(/'/g, "''");
  return `
SELECT
  s.Z_PK            AS id,
  s.ZTITLE           AS title,
  s.ZISFAVORITE      AS isFavorite,
  ${globalSelect(s)},
  ${sequenceDataSelect(s)},
  s.ZKEYCODE         AS legacyKeyCode,
  s.ZMODIFIERFLAGS   AS legacyModifierFlags,
  c.ZNAME            AS categoryName,
  c.ZISDEFAULT       AS categoryIsDefault
FROM ZSHORTCUT s
JOIN ZSHORTCUTCATEGORY c ON s.ZCATEGORY = c.Z_PK
JOIN ZAPPLICATION a ON c.ZAPPLICATION = a.Z_PK
WHERE a.ZBUNDLEIDENTIFIER = '${escaped}'
ORDER BY c.ZISDEFAULT ASC, c.ZNAME ASC, s.ZISFAVORITE DESC, s.ZTITLE ASC
`;
}

function allShortcutsQuery(s: SchemaInfo): string {
  return `
SELECT
  s.Z_PK            AS id,
  s.ZTITLE           AS title,
  s.ZISFAVORITE      AS isFavorite,
  ${globalSelect(s)},
  ${sequenceDataSelect(s)},
  s.ZKEYCODE         AS legacyKeyCode,
  s.ZMODIFIERFLAGS   AS legacyModifierFlags,
  c.ZNAME            AS categoryName,
  c.ZISDEFAULT       AS categoryIsDefault,
  a.ZLOCALIZEDNAME   AS appName,
  a.ZBUNDLEIDENTIFIER AS bundleIdentifier
FROM ZSHORTCUT s
JOIN ZSHORTCUTCATEGORY c ON s.ZCATEGORY = c.Z_PK
JOIN ZAPPLICATION a ON c.ZAPPLICATION = a.Z_PK
ORDER BY a.ZLOCALIZEDNAME ASC, c.ZISDEFAULT ASC, c.ZNAME ASC, s.ZTITLE ASC
`;
}

function globalShortcutsQuery(s: SchemaInfo): string {
  if (!s.hasGlobal) {
    // Column doesn't exist yet — return a query that yields no rows with same shape as ShortcutRowWithApp
    return `
SELECT
  s.Z_PK            AS id,
  s.ZTITLE           AS title,
  s.ZISFAVORITE      AS isFavorite,
  0                  AS isGlobal,
  ${sequenceDataSelect(s)},
  s.ZKEYCODE         AS legacyKeyCode,
  s.ZMODIFIERFLAGS   AS legacyModifierFlags,
  c.ZNAME            AS categoryName,
  c.ZISDEFAULT       AS categoryIsDefault,
  a.ZLOCALIZEDNAME   AS appName,
  a.ZBUNDLEIDENTIFIER AS bundleIdentifier
FROM ZSHORTCUT s
JOIN ZSHORTCUTCATEGORY c ON s.ZCATEGORY = c.Z_PK
JOIN ZAPPLICATION a ON c.ZAPPLICATION = a.Z_PK
WHERE 0`;
  }
  return `
SELECT
  s.Z_PK            AS id,
  s.ZTITLE           AS title,
  s.ZISFAVORITE      AS isFavorite,
  s.ZISGLOBAL        AS isGlobal,
  ${sequenceDataSelect(s)},
  s.ZKEYCODE         AS legacyKeyCode,
  s.ZMODIFIERFLAGS   AS legacyModifierFlags,
  c.ZNAME            AS categoryName,
  c.ZISDEFAULT       AS categoryIsDefault,
  a.ZLOCALIZEDNAME   AS appName,
  a.ZBUNDLEIDENTIFIER AS bundleIdentifier
FROM ZSHORTCUT s
JOIN ZSHORTCUTCATEGORY c ON s.ZCATEGORY = c.Z_PK
JOIN ZAPPLICATION a ON c.ZAPPLICATION = a.Z_PK
WHERE s.ZISGLOBAL = 1
ORDER BY a.ZLOCALIZEDNAME ASC, s.ZISFAVORITE DESC, s.ZTITLE ASC
`;
}

// ── Decoding ────────────────────────────────────────────────────────────

/**
 * Decode the sequenceData blob (JSON-encoded [ShortcutStep]) with
 * fallback to legacy keyCode/modifierFlags columns.
 *
 * Mirrors the Swift logic in Shortcut.swift → `var steps`.
 */
function decodeSteps(row: ShortcutRow): ShortcutStep[] {
  // Primary path: decode JSON from sequenceData
  if (row.sequenceData) {
    try {
      const json =
        typeof row.sequenceData === "string"
          ? row.sequenceData
          : row.sequenceData.toString("utf-8");

      if (json.length > 0) {
        const decoded = JSON.parse(json) as ShortcutStep[];
        if (Array.isArray(decoded) && decoded.length > 0) {
          return decoded;
        }
      }
    } catch {
      // Fall through to legacy path
    }
  }

  // Fallback: construct from legacy fields
  const hasContent = row.legacyKeyCode !== 0 || row.legacyModifierFlags !== 0;
  if (!hasContent) {
    return [{ modifierFlags: 0 }];
  }
  return [
    { keyCode: row.legacyKeyCode, modifierFlags: row.legacyModifierFlags },
  ];
}

function rowToShortcut(row: ShortcutRow): KommandShortcut {
  return {
    id: row.id,
    title: row.title,
    isFavorite: row.isFavorite === 1,
    isGlobal: row.isGlobal === 1,
    steps: decodeSteps(row),
    categoryName: row.categoryName,
    categoryIsDefault: row.categoryIsDefault === 1,
  };
}

// ── Public API ──────────────────────────────────────────────────────────

/** Fetch all shortcuts for a given app bundle identifier */
export async function getShortcutsForApp(
  bundleId: string,
): Promise<KommandShortcut[]> {
  const schema = await getSchema();
  const rows = await executeSQL<ShortcutRow>(
    DB_PATH,
    shortcutsForAppQuery(bundleId, schema),
  );
  return rows.map(rowToShortcut);
}

/** Group rows with app metadata into per-app arrays */
function groupRowsByApp(
  rows: ShortcutRowWithApp[],
): { appName: string; bundleId: string; shortcuts: KommandShortcut[] }[] {
  const appMap = new Map<
    string,
    { appName: string; bundleId: string; shortcuts: KommandShortcut[] }
  >();

  for (const row of rows) {
    const key = row.bundleIdentifier;
    if (!appMap.has(key)) {
      appMap.set(key, {
        appName: row.appName ?? row.bundleIdentifier,
        bundleId: row.bundleIdentifier,
        shortcuts: [],
      });
    }
    appMap.get(key)!.shortcuts.push(rowToShortcut(row));
  }

  return Array.from(appMap.values());
}

/** Fetch all shortcuts across all apps, grouped with app metadata */
export async function getAllShortcuts(): Promise<
  { appName: string; bundleId: string; shortcuts: KommandShortcut[] }[]
> {
  const schema = await getSchema();
  const rows = await executeSQL<ShortcutRowWithApp>(
    DB_PATH,
    allShortcutsQuery(schema),
  );
  return groupRowsByApp(rows);
}

/** Fetch shortcuts marked as global, grouped by application */
export async function getGlobalShortcuts(): Promise<
  { appName: string; bundleId: string; shortcuts: KommandShortcut[] }[]
> {
  const schema = await getSchema();
  const rows = await executeSQL<ShortcutRowWithApp>(
    DB_PATH,
    globalShortcutsQuery(schema),
  );
  return groupRowsByApp(rows);
}
