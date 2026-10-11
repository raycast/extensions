// Copied from badge-count-raycast src/lib/config.ts on 2026-09-30, unchanged except this header and STORAGE_KEY renamed selectedApps.v1 -> apps.v1 (SPEC.md §5.3)
// Pure selection-state operations (SPEC.md section 4). No Raycast imports.

export type SelectedApp = { bundleId: string; path: string; name: string };
export type InstalledApp = { bundleId?: string; path: string; name: string };

export const STORAGE_KEY = "apps.v1";

/** First-run order. Teams has two bundle IDs across versions. */
export const DEFAULT_SELECTION: string[][] = [
  ["com.apple.reminders"],
  ["com.apple.mail"],
  ["net.whatsapp.WhatsApp"],
  ["com.apple.iCal"],
  ["com.tinyspeck.slackmacgap"],
  ["com.hnc.Discord"],
  ["com.microsoft.teams2", "com.microsoft.teams"],
];

function toSelected(app: InstalledApp): SelectedApp | undefined {
  return app.bundleId ? { bundleId: app.bundleId, path: app.path, name: app.name } : undefined;
}

/** The default candidates that are installed, in the section 4 order. */
export function seedSelection(installed: InstalledApp[]): SelectedApp[] {
  const result: SelectedApp[] = [];
  for (const ids of DEFAULT_SELECTION) {
    const app = ids.map((id) => installed.find((candidate) => candidate.bundleId === id)).find(Boolean);
    const selected = app && toSelected(app);
    if (selected) result.push(selected);
  }
  return result;
}

export type ParsedSelection = { status: "missing" } | { status: "corrupt" } | { status: "ok"; apps: SelectedApp[] };

/** Parse the stored JSON string. An empty array is a valid, deliberate selection. */
export function parseSelection(raw: unknown): ParsedSelection {
  if (raw === undefined) return { status: "missing" };
  if (typeof raw !== "string") return { status: "corrupt" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: "corrupt" };
  }
  if (!Array.isArray(parsed)) return { status: "corrupt" };
  const apps: SelectedApp[] = [];
  for (const entry of parsed) {
    if (typeof entry !== "object" || entry === null) return { status: "corrupt" };
    const { bundleId, path, name } = entry as Record<string, unknown>;
    if (typeof bundleId !== "string" || !bundleId || typeof path !== "string" || typeof name !== "string") {
      return { status: "corrupt" };
    }
    if (!apps.some((app) => app.bundleId === bundleId)) apps.push({ bundleId, path, name });
  }
  return { status: "ok", apps };
}

export function serializeSelection(apps: SelectedApp[]): string {
  return JSON.stringify(apps.map(({ bundleId, path, name }) => ({ bundleId, path, name })));
}

export function addApp(apps: SelectedApp[], app: InstalledApp): SelectedApp[] {
  const selected = toSelected(app);
  if (!selected || apps.some((existing) => existing.bundleId === selected.bundleId)) return apps;
  return [...apps, selected];
}

export function removeApp(apps: SelectedApp[], bundleId: string): SelectedApp[] {
  return apps.filter((app) => app.bundleId !== bundleId);
}

export function moveApp(apps: SelectedApp[], bundleId: string, direction: "up" | "down"): SelectedApp[] {
  const index = apps.findIndex((app) => app.bundleId === bundleId);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= apps.length) return apps;
  const next = [...apps];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** Installed apps with a bundle ID that are not selected, sorted by name. */
export function availableApps(installed: InstalledApp[], selected: SelectedApp[]): SelectedApp[] {
  const chosen = new Set(selected.map((app) => app.bundleId));
  const seen = new Set<string>();
  const result: SelectedApp[] = [];
  for (const app of installed) {
    const candidate = toSelected(app);
    if (!candidate || chosen.has(candidate.bundleId) || seen.has(candidate.bundleId)) continue;
    seen.add(candidate.bundleId);
    result.push(candidate);
  }
  return result.sort((a, b) => a.name.localeCompare(b.name));
}
