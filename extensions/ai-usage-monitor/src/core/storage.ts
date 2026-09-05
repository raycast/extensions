import { LocalStorage } from "@raycast/api";
import { AlertState } from "./thresholds";

const ALERT_STATE_KEY = "alert-state.v1";
const LAST_CHECK_KEY = "last-check.v1";

export async function loadAlertState(): Promise<AlertState> {
  const raw = await LocalStorage.getItem<string>(ALERT_STATE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    // Tolerate a shape change from an older version rather than throwing.
    const state: AlertState = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (Array.isArray(value) && value.every((entry) => typeof entry === "string")) {
        state[key] = value as string[];
      }
    }
    return state;
  } catch {
    return {};
  }
}

export async function saveAlertState(state: AlertState): Promise<void> {
  await LocalStorage.setItem(ALERT_STATE_KEY, JSON.stringify(state));
}

export async function recordCheck(at: Date = new Date()): Promise<void> {
  await LocalStorage.setItem(LAST_CHECK_KEY, at.toISOString());
}

export async function lastCheck(): Promise<Date | null> {
  const raw = await LocalStorage.getItem<string>(LAST_CHECK_KEY);
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
