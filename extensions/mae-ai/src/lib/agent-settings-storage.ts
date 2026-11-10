import { getPreferenceValues, LocalStorage } from "@raycast/api";
import {
  AskBackend,
  changeAgentBackend,
  readAgentSettings,
  SavedAgentSettings,
} from "./agent-settings";
import { Preferences } from "./preferences";

const settingsKey = "pocket-ai.agent-settings.v1";

export async function loadAgentSettings(): Promise<
  SavedAgentSettings | undefined
> {
  return readAgentSettings(
    () => LocalStorage.getItem<string>(settingsKey),
    saveAgentSettings,
    getPreferenceValues<Preferences>(),
  );
}

export async function saveAgentSettings(
  settings: SavedAgentSettings,
): Promise<void> {
  await LocalStorage.setItem(settingsKey, JSON.stringify(settings));
}

export async function switchAgentBackend(backend: AskBackend) {
  return changeAgentBackend(
    backend,
    loadAgentSettings,
    saveAgentSettings,
    getPreferenceValues<Preferences>(),
  );
}
