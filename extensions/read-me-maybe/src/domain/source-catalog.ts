export const sourceCatalogVersion = 1;

export type StoredSource = {
  id: string;
  name: string;
  dockName: string;
  appPath?: string;
  openCommand?: string;
  enabled: boolean;
};

export type SourceCatalog = {
  version: typeof sourceCatalogVersion;
  sources: StoredSource[];
};

export function nameFromApplication(appPath: string): string {
  const bundle =
    appPath
      .split("/")
      .filter((segment) => segment !== "")
      .at(-1) ?? appPath;
  return bundle.toLowerCase().endsWith(".app") ? bundle.slice(0, -".app".length) : bundle;
}

export function parseSourceCatalog(raw: string | undefined): SourceCatalog | undefined {
  if (!raw) return undefined;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return undefined;
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return undefined;
  const envelope = parsed as Record<string, unknown>;
  if (envelope.version !== sourceCatalogVersion || !Array.isArray(envelope.sources)) return undefined;

  const sources: StoredSource[] = [];
  for (const entry of envelope.sources) {
    const row = parseStoredSource(entry);
    if (!row) return undefined;
    sources.push(row);
  }
  if (!idsAreUnique(sources)) return undefined;
  return { version: sourceCatalogVersion, sources };
}

export function idsAreUnique(sources: readonly StoredSource[]): boolean {
  const ids = new Set(sources.map((row) => row.id));
  return ids.size === sources.length;
}

export function validateSourceRow(row: StoredSource, catalogRows: readonly StoredSource[]): string | undefined {
  if (row.name.trim() === "") return "Name is required";
  if (row.dockName.trim() === "") return "Dock item name is required";
  const duplicate = catalogRows.some(
    (other) => other.id !== row.id && other.appPath !== undefined && other.appPath === row.appPath,
  );
  if (duplicate) return "Application is already in the Source Catalog";
  return undefined;
}

export function createSourceRow(fields: { id?: string; appPath: string; openCommand?: string }): StoredSource {
  const name = nameFromApplication(fields.appPath);
  const openCommand = fields.openCommand?.trim();
  return {
    id: fields.id ?? crypto.randomUUID(),
    name,
    dockName: name,
    appPath: fields.appPath,
    ...(openCommand ? { openCommand } : {}),
    enabled: true,
  };
}

/** The seed Source: the Messages Application plus its derived fields — no explicit Open Command. */
export const seedSource: StoredSource = createSourceRow({
  id: "messages",
  appPath: "/System/Applications/Messages.app",
});

function parseStoredSource(value: unknown): StoredSource | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || row.id.trim() === "") return undefined;
  if (typeof row.name !== "string" || row.name.trim() === "") return undefined;
  if (typeof row.dockName !== "string" || row.dockName.trim() === "") return undefined;
  if (typeof row.enabled !== "boolean") return undefined;
  if (row.appPath !== undefined && typeof row.appPath !== "string") return undefined;
  if (row.openCommand !== undefined && typeof row.openCommand !== "string") return undefined;

  return {
    id: row.id,
    name: row.name,
    dockName: row.dockName,
    ...(row.appPath !== undefined ? { appPath: row.appPath } : {}),
    ...(row.openCommand !== undefined ? { openCommand: row.openCommand } : {}),
    enabled: row.enabled,
  };
}
