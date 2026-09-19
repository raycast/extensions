/**
 * Visual accents for suggestion pills by task type.
 * Keep in sync with QuickShell.Core TaskTypeCatalog GetAccentArgb / GetMarkerEmoji.
 * Uses Raycast Icon/Color string values so Vitest can import this without @raycast/api.
 */
const ACCENTS: Record<string, { source: string; tintColor: string }> = {
  api: { source: "globe-01-16", tintColor: "raycast-blue" },
  frontend: { source: "app-window-16", tintColor: "raycast-green" },
  services: { source: "hard-drive-16", tintColor: "raycast-secondary-text" },
  logs: { source: "bullet-points-16", tintColor: "raycast-magenta" },
  test: { source: "check-circle-16", tintColor: "raycast-yellow" },
  build: { source: "hammer-16", tintColor: "raycast-orange" },
  agent: { source: "speech-bubble-16", tintColor: "raycast-purple" },
};

const FALLBACK = { source: "light-bulb-16", tintColor: "raycast-secondary-text" };

export function suggestionPillIcon(taskType: string | undefined): { source: string; tintColor: string } {
  const key = (taskType ?? "").trim().toLowerCase();
  return ACCENTS[key] ?? FALLBACK;
}
