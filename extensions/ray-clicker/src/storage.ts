import { LocalStorage } from "@raycast/api";
import { GameState, INITIAL_STATE } from "./types";

const GAME_STATE_KEY = "idle-clicker-state";

export async function loadGameState(): Promise<GameState> {
  try {
    const json = await LocalStorage.getItem(GAME_STATE_KEY);
    if (typeof json !== "string") return { ...INITIAL_STATE };

    const savedState = JSON.parse(json) as Partial<GameState>;
    const now = Date.now();

    // Ensure prestige upgrades object exists
    const prestige = {
      ...INITIAL_STATE.prestige,
      ...(savedState.prestige || {}),
      upgrades: {
        ...INITIAL_STATE.prestige.upgrades,
        ...(savedState.prestige?.upgrades || {}),
      },
    };

    // Ensure settings object exists
    const settings = {
      ...INITIAL_STATE.settings,
      ...(savedState.settings || {}),
    };

    return {
      ...INITIAL_STATE,
      ...savedState,
      prestige,
      settings,
      // Important: Do NOT accrue offline progress here; handled centrally in useGameState
      currency: savedState.currency || 0,
      // Preserve saved lastUpdate so useGameState can compute offline progress
      lastUpdate: (savedState as Partial<GameState>).lastUpdate || now,
    };
  } catch (error) {
    console.error("Error loading game state:", error);
    return { ...INITIAL_STATE };
  }
}

export async function saveGameState(state: GameState): Promise<void> {
  try {
    // Avoid clobbering newer data in dev reloads or unmounts: compare timestamps
    const existing = await LocalStorage.getItem(GAME_STATE_KEY);
    let existingTs = 0;
    if (typeof existing === "string") {
      try {
        const parsed = JSON.parse(existing) as Partial<GameState> & { lastUpdate?: number };
        existingTs = typeof parsed.lastUpdate === "number" ? parsed.lastUpdate : 0;
      } catch {
        existingTs = 0;
      }
    }

    const incomingBase = typeof state.lastUpdate === "number" ? state.lastUpdate : 0;
    const incomingTs = Math.max(incomingBase, Date.now());
    if (existingTs > incomingTs) {
      // Existing data is newer; skip save to prevent stale overwrite
      return;
    }

    const stateToSave = { ...state, lastUpdate: incomingTs };
    await LocalStorage.setItem(GAME_STATE_KEY, JSON.stringify(stateToSave));
  } catch (error) {
    console.error("Error saving game state:", error);
  }
}

export async function resetGameState(): Promise<GameState> {
  const newState = { ...INITIAL_STATE };
  await saveGameState(newState);
  return newState;
}
