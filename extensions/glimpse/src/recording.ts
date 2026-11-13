import { launchCommand, LaunchType } from "@raycast/api";

// h:mm:ss past an hour, otherwise mm:ss.
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = String(total % 60).padStart(2, "0");
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}`
    : `${String(minutes).padStart(2, "0")}:${seconds}`;
}

// Whole minutes for the menu bar title, which can only refresh every 10
// seconds; seconds there would visibly lag.
export function formatMinutes(ms: number): string {
  const minutes = Math.max(0, Math.floor(ms / 60000));
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m` : `${minutes}m`;
}

// Updates the menu bar timer right away instead of on its next interval.
export async function refreshMenuBar() {
  try {
    await launchCommand({ name: "recording-status", type: LaunchType.Background });
  } catch {
    // The menu bar command is disabled.
  }
}
