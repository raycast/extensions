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
export interface RuntimeCredentials {
  serverUrl?: string;
  accessToken?: string;
  demoMode?: boolean;
}

export const CREDENTIALS_KEY = "credentials:stored";

export async function loadCredentials(): Promise<RuntimeCredentials | undefined> {
  const stored = await LocalStorage.getItem<string>(CREDENTIALS_KEY);
  if (!stored) return undefined;
  try {
    return JSON.parse(stored) as RuntimeCredentials;
  } catch {
    return undefined;
  }
}

export async function saveCredentials(credentials: RuntimeCredentials): Promise<void> {
  await LocalStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials));
}

export function createRuntime(credentials?: RuntimeCredentials): {
  service: MusicService;
  controller: PlaybackController;
} {
  const preferences = getPreferenceValues<Preferences>();
  const demoMode = credentials?.demoMode ?? preferences.demoMode;
  const serverUrl = credentials?.serverUrl ?? preferences.serverUrl;
  const accessToken = credentials?.accessToken ?? preferences.accessToken;

  if (!demoMode) {
    if (!serverUrl?.trim() || !accessToken?.trim()) {
      throw new AudioAssistantError(
        "not-ready",
        "Set your Music Assistant server URL and access token in extension preferences.",
      );
    }
    const client = new HttpCommandClient(serverUrl, accessToken);
    const service = new LiveMusicService({ serverUrl, client });
    return { service, controller: new PlaybackController(service, activePlayerStore) };
  }
  const service = new DemoMusicService();
  return { service, controller: new PlaybackController(service, activePlayerStore) };
}

export async function createRuntimeAsync(): Promise<{ service: MusicService; controller: PlaybackController }> {
  try {
    return createRuntime();
  } catch (error) {
    const stored = await loadCredentials();
    if (stored) return createRuntime(stored);
    throw error;
  }
}
