import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { AudioAssistantError } from "./domain/policy";
import { PlaybackController } from "./services/controller";
import { DemoMusicService } from "./services/demo";
import { HttpCommandClient } from "./services/http-client";
import { LiveMusicService } from "./services/live";
import type { ActivePlayerStore, MusicService } from "./services/port";

export const activePlayerStore: ActivePlayerStore = {
  get: (scope) => LocalStorage.getItem<string>(`active-player:${scope}`),
  set: (scope, id) => LocalStorage.setItem(`active-player:${scope}`, id),
};
export function createRuntime(): { service: MusicService; controller: PlaybackController } {
  const preferences = getPreferenceValues<{ demoMode: boolean; serverUrl?: string; accessToken?: string }>();
  if (!preferences.demoMode) {
    if (!preferences.serverUrl?.trim() || !preferences.accessToken?.trim()) {
      throw new AudioAssistantError(
        "not-ready",
        "Set your Music Assistant server URL and access token in extension preferences.",
      );
    }
    const client = new HttpCommandClient(preferences.serverUrl, preferences.accessToken);
    const service = new LiveMusicService({ serverUrl: preferences.serverUrl, client });
    return { service, controller: new PlaybackController(service, activePlayerStore) };
  }
  const service = new DemoMusicService();
  return { service, controller: new PlaybackController(service, activePlayerStore) };
}
