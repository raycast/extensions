export type VersionedLoad<S> =
  | { kind: "ok"; store: S; changed: boolean; dropped: number }
  | { kind: "empty" }
  | { kind: "corrupt"; raw: string }
  | { kind: "newer"; version: number };

export interface ParsedStore<S> {
  store: S;
  changed: boolean;
  entries: number;
  kept: number;
}

export interface VersionedStoreSpec<S> {
  version: number;
  parse: (value: Record<string, unknown>) => ParsedStore<S> | undefined;
}

export type LoadPlan<S> =
  | { readOnly: true; notice: "newer" }
  | { readOnly: false; store: S; save: boolean; backup?: string; notice?: "corrupt" | "partial" };

export function loadVersionedStore<S>(raw: string | undefined, spec: VersionedStoreSpec<S>): VersionedLoad<S> {
  if (raw === undefined) return { kind: "empty" };
  const value = parseJson(raw);
  if (!isRecord(value) || !Number.isInteger(value.version)) return { kind: "corrupt", raw };
  const version = value.version as number;
  if (version > spec.version) return { kind: "newer", version };
  if (version < 1) return { kind: "corrupt", raw };
  const parsed = spec.parse(value);
  if (!parsed || (parsed.entries > 0 && parsed.kept === 0)) return { kind: "corrupt", raw };
  return {
    kind: "ok",
    store: parsed.store,
    changed: parsed.changed || version !== spec.version,
    dropped: parsed.entries - parsed.kept,
  };
}

export function planVersionedLoad<S>(
  raw: string | undefined,
  spec: VersionedStoreSpec<S>,
  fallback: () => S,
): LoadPlan<S> {
  const load = loadVersionedStore(raw, spec);
  switch (load.kind) {
    case "newer":
      return { readOnly: true, notice: "newer" };
    case "empty":
      return { readOnly: false, store: fallback(), save: true };
    case "corrupt":
      return { readOnly: false, store: fallback(), save: true, backup: load.raw, notice: "corrupt" };
    case "ok":
      if (load.dropped > 0 && raw !== undefined) {
        return { readOnly: false, store: load.store, save: true, backup: raw, notice: "partial" };
      }
      return { readOnly: false, store: load.store, save: load.changed };
  }
}

export function backupKey(prefix: string, now: Date): string {
  return `${prefix}.${now.toISOString()}`;
}

export function isNewerStore(raw: string | undefined, version: number): boolean {
  if (raw === undefined) return false;
  const value = parseJson(raw);
  return isRecord(value) && Number.isInteger(value.version) && (value.version as number) > version;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}
