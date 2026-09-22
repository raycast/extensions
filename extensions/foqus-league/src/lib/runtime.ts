import { environment, getPreferenceValues } from "@raycast/api";
import { collectorPaths as pathsUnder, collectorStatus as statusOf } from "./collector.ts";
import { learnGoalBlocks as learn } from "./goalBlocks.ts";
import { parsePreferences, type Preferences, type RawPreferences } from "./prefs.ts";
import { LocalSessionStore } from "./store.ts";
import { liveSources, syncIfStale as staleSync, syncSessions as fullSync } from "./sync.ts";

export const SUPPORT_URL = "https://buymeacoffee.com/filipimiparebine";

export function getPreferences(): Preferences {
  return parsePreferences(getPreferenceValues<RawPreferences>());
}

export const store = new LocalSessionStore(environment.supportPath);
export const collectorPaths = () => pathsUnder(environment.supportPath);
export const collectorStatus = () => statusOf(collectorPaths());
export const syncSessions = () => fullSync(store, liveSources(collectorPaths()));
export const syncIfStale = () => staleSync(store, liveSources(collectorPaths()));
export const learnGoalBlocks = () => learn(store);
