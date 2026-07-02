import { resolveZones } from "./aliases";
import type { ZoneInfo } from "./types";

const STORAGE_KEY = "timezoner.zones";

type RaycastApi = typeof import("@raycast/api");

async function getLocalStorage(): Promise<RaycastApi["LocalStorage"]> {
  const moduleName = "@raycast/api";
  const api = (await import(/* @vite-ignore */ moduleName)) as RaycastApi;
  return api.LocalStorage;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

function isStoredZoneInfo(value: unknown): value is ZoneInfo {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.label === "string" &&
    typeof candidate.timezone === "string" &&
    isValidTimezone(candidate.timezone)
  );
}

export function addZone(zones: ZoneInfo[], zone: ZoneInfo): ZoneInfo[] {
  const timezone = normalize(zone.timezone);
  return [
    ...zones.filter((existing) => normalize(existing.timezone) !== timezone),
    zone,
  ];
}

export function removeZone(
  zones: ZoneInfo[],
  labelOrTimezone: string,
): ZoneInfo[] {
  const target = normalize(labelOrTimezone);
  return zones.filter(
    (zone) =>
      normalize(zone.label) !== target && normalize(zone.timezone) !== target,
  );
}

export function replaceZone(
  zones: ZoneInfo[],
  originalTimezone: string,
  updatedZone: ZoneInfo,
): ZoneInfo[] {
  const original = normalize(originalTimezone);
  const updated = normalize(updatedZone.timezone);
  const withoutOriginalOrUpdated = zones.filter(
    (zone) =>
      normalize(zone.timezone) !== original &&
      normalize(zone.timezone) !== updated,
  );

  const originalIndex = zones.findIndex(
    (zone) => normalize(zone.timezone) === original,
  );

  if (originalIndex === -1) {
    return addZone(zones, updatedZone);
  }

  const insertionIndex = zones
    .slice(0, originalIndex)
    .filter(
      (zone) =>
        normalize(zone.timezone) !== original &&
        normalize(zone.timezone) !== updated,
    ).length;

  return [
    ...withoutOriginalOrUpdated.slice(0, insertionIndex),
    updatedZone,
    ...withoutOriginalOrUpdated.slice(insertionIndex),
  ];
}

export function parseStoredZones(stored: string): ZoneInfo[] | undefined {
  try {
    const parsed = JSON.parse(stored) as unknown;
    if (!Array.isArray(parsed) || !parsed.every(isStoredZoneInfo)) {
      return undefined;
    }
    return parsed;
  } catch {
    return undefined;
  }
}

export async function loadZones(defaultZones: string): Promise<ZoneInfo[]> {
  const LocalStorage = await getLocalStorage();
  const stored = await LocalStorage.getItem<string>(STORAGE_KEY);

  if (typeof stored !== "string") {
    return resolveZones(defaultZones);
  }

  const parsed = parseStoredZones(stored);
  if (!parsed) {
    await LocalStorage.removeItem(STORAGE_KEY);
    return resolveZones(defaultZones);
  }

  return parsed;
}

export async function saveZones(zones: ZoneInfo[]): Promise<void> {
  if (!parseStoredZones(JSON.stringify(zones))) {
    throw new Error("Cannot save invalid zones");
  }

  const LocalStorage = await getLocalStorage();
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(zones));
}
