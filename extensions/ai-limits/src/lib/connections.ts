import { asRecord, asString } from "./http";
import type { Settings } from "./types";

// Credentials the extension stores itself after a one-click Connect. The extension can't write Raycast preferences, so
// these live in LocalStorage (see connections-store.ts). The field names match the Settings fields.
export type Connections = Pick<
  Settings,
  | "claudeKeychain"
  | "claudeConfigDir"
  | "codexHome"
  | "claudeSessionKey"
  | "cursorCookie"
  | "openrouterApiKey"
  | "zaiApiKey"
  | "zaiRegion"
  | "kimiApiKey"
  | "deepseekApiKey"
  | "moonshotApiKey"
  | "moonshotRegion"
>;

const TEXT_FIELDS = [
  "claudeConfigDir",
  "codexHome",
  "claudeSessionKey",
  "cursorCookie",
  "openrouterApiKey",
  "zaiApiKey",
  "kimiApiKey",
  "deepseekApiKey",
  "moonshotApiKey",
] as const;

const REGION_FIELDS = ["zaiRegion", "moonshotRegion"] as const;

// Keeps only the fields with the right type. Strings are trimmed and dropped when empty, so saving "" clears one. A
// region must be one of the two known values, and claudeKeychain counts only when it is exactly true. Anything else is
// dropped, so a damaged or hand-edited value can never produce a setting the providers don't expect.
function normalize(record: Record<string, unknown>): Connections {
  const connections: Connections = {};
  if (record.claudeKeychain === true) {
    connections.claudeKeychain = true;
  }
  for (const field of TEXT_FIELDS) {
    const value = asString(record[field]);
    if (value !== undefined) {
      connections[field] = value;
    }
  }
  for (const field of REGION_FIELDS) {
    const value = record[field];
    if (value === "global" || value === "china") {
      connections[field] = value;
    }
  }
  return connections;
}

// Reads the stored JSON. Invalid JSON gives an empty set rather than an error, so a damaged value only means the user
// has to connect again.
export function parseConnections(raw: string | undefined): Connections {
  if (raw === undefined) {
    return {};
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return {};
  }
  const record = asRecord(json);
  return record ? normalize(record) : {};
}

export function serializeConnections(connections: Connections): string {
  return JSON.stringify(normalize(connections));
}

// Adds the fields in `patch` to `current`. An undefined field in the patch leaves the stored value as it is. An empty
// string or false clears the field, since normalize drops those.
export function mergeConnections(current: Connections, patch: Partial<Connections>): Connections {
  const merged: Record<string, unknown> = { ...current };
  for (const [field, value] of Object.entries(patch)) {
    if (value !== undefined) {
      merged[field] = value;
    }
  }
  return normalize(merged);
}

// Removes the listed fields and keeps the rest, such as when the user signs out of a provider.
export function withoutConnections(current: Connections, keys: (keyof Connections)[]): Connections {
  const remaining: Record<string, unknown> = { ...current };
  for (const key of keys) {
    delete remaining[key];
  }
  return normalize(remaining);
}
