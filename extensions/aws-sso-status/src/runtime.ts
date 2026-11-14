import { applyPrimarySelection } from "./selection";
import { Cache, environment, getPreferenceValues } from "@raycast/api";
import { statSync } from "node:fs";
import { join } from "node:path";
import { configPath } from "./aws/config";
import { StatusCoordinator, scopeFor } from "./aws/coordinator";
import { MetadataStore, hashKey } from "./aws/store";
import { Settings, Snapshot } from "./aws/types";
import { getStatusFromExpiration } from "./aws/status";

const cache = new Cache({ namespace: "ui-metadata-v2" });
export const metadataStore = new MetadataStore(join(environment.supportPath, "status-metadata-v2"));
export const coordinator = new StatusCoordinator(metadataStore);
function selectionKey() {
  return `primary:${hashKey(configPath())}`;
}
export function effectiveSettings(raw = getPreferenceValues<Settings>()): Settings {
  try {
    const selection = JSON.parse(cache.get(selectionKey()) || "null");
    return applyPrimarySelection(raw, selection);
  } catch {
    /* Ignore evicted or invalid local selection. */
  }
  return raw;
}
export function savePrimary(name?: string): Settings {
  const raw = getPreferenceValues<Settings>();
  if (name) cache.set(selectionKey(), JSON.stringify({ name, preference: raw.primaryProfile || "" }));
  else cache.remove(selectionKey());
  return effectiveSettings(raw);
}
function snapshotKey(settings: Settings) {
  let revision = "missing";
  try {
    const info = statSync(configPath());
    revision = `${info.mtimeMs}:${info.size}`;
  } catch {
    /* Empty/error state is refreshed normally. */
  }
  return `snapshot:${hashKey([scopeFor(settings), settings.profileFilter || "", revision])}`;
}
export function readSnapshot(settings: Settings): Snapshot {
  try {
    const snapshot: Snapshot = JSON.parse(cache.get(snapshotKey(settings)) || "null");
    if (!snapshot || !Array.isArray(snapshot.profiles)) return { profiles: [] };
    return {
      ...snapshot,
      profiles: snapshot.profiles.map((item) => ({
        ...item,
        stale: item.stale || !item.checkedAt || Date.now() - Date.parse(item.checkedAt) > 120000,
        status: ["Signed In", "Expiring Soon", "Expired"].includes(item.status)
          ? getStatusFromExpiration(item.expiration, Number(settings.threshold) || 30)
          : item.status,
      })),
    };
  } catch {
    return { profiles: [] };
  }
}
export function saveSnapshot(settings: Settings, snapshot: Snapshot) {
  // Profiles originate exclusively from the metadata-only config parser and status boundary.
  cache.set(snapshotKey(settings), JSON.stringify(snapshot));
}
