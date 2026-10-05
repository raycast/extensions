import { LocalStorage } from "@raycast/api";
import { GameState, INITIAL_STATE } from "./types";

const GAME_STATE_KEY = "ray-clicker-state";
const LEGACY_GAME_STATE_KEYS = ["idle-clicker-state"] as const;
let saveQueue: Promise<void> = Promise.resolve();

export async function loadGameState(): Promise<GameState> {
  try {
    // Prefer the new key; fall back to legacy keys for migration
    let json = await LocalStorage.getItem(GAME_STATE_KEY);
    let loadedFromLegacy: (typeof LEGACY_GAME_STATE_KEYS)[number] | null = null;
    if (typeof json !== "string") {
      for (const legacyKey of LEGACY_GAME_STATE_KEYS) {
        const legacy = await LocalStorage.getItem(legacyKey);
        if (typeof legacy === "string") {
          json = legacy;
          loadedFromLegacy = legacyKey;
          break;
        }
      }
    }
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

    // Ensure achievements map exists
    const achievements = {
      ...(INITIAL_STATE.achievements || {}),
      ...((savedState as Partial<GameState>).achievements || {}),
    };

    const result: GameState = {
      ...INITIAL_STATE,
      ...savedState,
      prestige,
      settings,
      achievements,
      // Important: Do NOT accrue offline progress here; handled centrally in useGameState
      currency: savedState.currency || 0,
      // Preserve saved lastUpdate so useGameState can compute offline progress
      lastUpdate: (savedState as Partial<GameState>).lastUpdate || now,
    };

    // One-time migration: if loaded from legacy key, persist under the new key and remove the legacy item
    if (loadedFromLegacy) {
      try {
        await LocalStorage.setItem(GAME_STATE_KEY, JSON.stringify(result));
        await LocalStorage.removeItem(loadedFromLegacy);
      } catch {
        // Best-effort migration; ignore failures
      }
    }

    return result;
  } catch (error) {
    console.error("Error loading game state:", error);
    return { ...INITIAL_STATE };
  }
}

export async function saveGameState(state: GameState): Promise<void> {
  const incomingBase = typeof state.lastUpdate === "number" ? state.lastUpdate : 0;
  const incomingTs = Math.max(incomingBase, Date.now());
  let serializedState: string;

  try {
    // Capture this exact state before waiting for earlier saves to finish.
    serializedState = JSON.stringify({ ...state, lastUpdate: incomingTs });
  } catch (error) {
    console.error("Error saving game state:", error);
    return;
  }

  saveQueue = saveQueue.then(async () => {
    try {
      // Avoid clobbering newer data written by another extension process.
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

      if (existingTs > incomingTs) return;

      await LocalStorage.setItem(GAME_STATE_KEY, serializedState);
    } catch (error) {
      console.error("Error saving game state:", error);
    }
  });

  await saveQueue;
}

export async function resetGameState(): Promise<GameState> {
  const newState = { ...INITIAL_STATE, lastUpdate: Date.now() };
  await saveGameState(newState);
  return newState;
}
