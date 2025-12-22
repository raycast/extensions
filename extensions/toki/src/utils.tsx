import { showHUD, launchCommand, LaunchType } from "@raycast/api";

export function sortByDuration<T extends { uuid: string; trackedDuration: number }>(
  items: T[],
  activeUuid?: string
): T[] {
  return [...items].sort((a, b) => {
    if (activeUuid) {
      if (a.uuid === activeUuid) return -1;
      if (b.uuid === activeUuid) return 1;
    }
    return b.trackedDuration - a.trackedDuration;
  });
}

export async function showErrorHUD(action: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error ${action}:`, message);
  await showHUD(`Error ${action}: ${message}`);
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

export async function refreshMenuBar() {
  try {
    await launchCommand({ name: "menu-bar", type: LaunchType.Background });
  } catch {
    // Menu bar command may not be active
  }
}
