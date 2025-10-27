import { LocalStorage } from "@raycast/api";
import { StoredState, SoundrawConfig } from "./types";

const STORAGE_KEY = "soundraw_state";

async function readState(): Promise<StoredState> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as Partial<StoredState>;
    return {
      soundrawConfig: parsed.soundrawConfig,
    };
  } catch {
    return {};
  }
}

async function writeState(next: StoredState): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export async function saveSoundrawConfig(token: string, apiBaseUrl: string): Promise<void> {
  const state = await readState();
  const soundrawConfig: SoundrawConfig = {
    token,
    apiBaseUrl,
    createdAt: new Date().toISOString(),
  };
  const next: StoredState = {
    ...state,
    soundrawConfig,
  };
  await writeState(next);
}

export async function getSoundrawConfig(): Promise<SoundrawConfig | undefined> {
  const state = await readState();
  return state.soundrawConfig;
}

export async function getSoundrawToken(): Promise<string | undefined> {
  const config = await getSoundrawConfig();
  return config?.token;
}

export async function getSoundrawApiBaseUrl(): Promise<string | undefined> {
  const config = await getSoundrawConfig();
  return config?.apiBaseUrl;
}

export async function deleteSoundrawConfig(): Promise<void> {
  const state = await readState();
  const next: StoredState = {
    ...state,
    soundrawConfig: undefined,
  };
  await writeState(next);
}

export async function hasValidConfig(): Promise<boolean> {
  const config = await getSoundrawConfig();
  return !!(
    config?.token &&
    config?.apiBaseUrl &&
    config.token.trim().length > 0 &&
    config.apiBaseUrl.trim().length > 0
  );
}
