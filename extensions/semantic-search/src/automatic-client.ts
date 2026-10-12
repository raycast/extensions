import { readFile } from "node:fs/promises";
import { join } from "node:path";

export type AutomaticPreferences = {
  enabled: boolean;
  interval_seconds: number;
  only_on_power: boolean;
};
export type AutomaticStatus = AutomaticPreferences & {
  paused: boolean;
  pending_resume?: boolean;
  continuation_origin?: "manual" | "automatic" | null;
  last_reason?: string;
  last_error?: string | null;
  last_completed_at?: number | null;
  next_update_at?: number | null;
  revision: number;
  state?: string;
};
export const automaticDefaults: AutomaticStatus = {
  enabled: false,
  interval_seconds: 3600,
  only_on_power: true,
  paused: false,
  revision: 0,
};
export const preferenceKey = (settings: AutomaticPreferences) =>
  JSON.stringify([
    settings.enabled,
    settings.interval_seconds,
    settings.only_on_power,
  ]);

export async function automaticEnabled(storage: string): Promise<boolean> {
  try {
    const saved = JSON.parse(
      await readFile(join(storage, "automatic-indexing.json"), "utf8"),
    );
    return Boolean(
      saved &&
      typeof saved === "object" &&
      saved.enabled === true &&
      saved.paused === false,
    );
  } catch (error) {
    if (
      (error as NodeJS.ErrnoException).code === "ENOENT" ||
      error instanceof SyntaxError
    )
      return false;
    throw error;
  }
}

export function automaticSummary(status: AutomaticStatus) {
  if (!status.enabled) return "Off. Manual index updates remain available.";
  if (status.paused) return "Paused. Resume in Actions when ready.";
  if (status.state === "indexing" || status.last_reason === "indexing")
    return "Updating the index in the background.";
  if (["on_battery", "power_unavailable"].includes(status.last_reason || ""))
    return "Waiting for external power.";
  if (status.last_error) return `Last update: ${status.last_error}`;
  if (status.pending_resume)
    return "Will continue saved progress on the next launcher check.";
  return status.next_update_at
    ? `Next update after ${new Date(status.next_update_at * 1000).toLocaleString()}. Launcher scheduling may delay the check.`
    : "Ready for the first scheduled check.";
}
