import { LocalStorage } from "@raycast/api";

export type MenuBarDateStyle = "day-month" | "month-day";

export type MenuBarRowLayout =
  | "date-time-title"
  | "date-title-time"
  | "time-date-title"
  | "time-title-date"
  | "title-date-time"
  | "title-time-date";

export type MenuBarDisplaySettings = {
  onlyMeetings: boolean;
  eventCount: number;
  dateStyle: MenuBarDateStyle;
  rowLayout: MenuBarRowLayout;
};

const DISPLAY_SETTINGS_KEY = "menu-bar-display-settings-v2";

// Legacy keys from earlier builds. They are read only if the atomic v2 record
// does not exist yet. Once v2 has been created, it is the sole source of truth.
const LEGACY_ONLY_MEETINGS_KEY = "menu-bar-only-meetings";
const LEGACY_EVENT_COUNT_KEY = "menu-bar-event-count";
const LEGACY_DATE_STYLE_KEY = "menu-bar-date-style";
const LEGACY_ROW_LAYOUT_KEY = "menu-bar-row-layout";

const VALID_EVENT_COUNTS = new Set([5, 8, 10, 12, 15]);

export const DEFAULT_MENU_BAR_DISPLAY_SETTINGS: MenuBarDisplaySettings = {
  onlyMeetings: false,
  eventCount: 10,
  dateStyle: "day-month",
  rowLayout: "date-time-title",
};

export function normaliseMenuBarDisplaySettings(
  value: Partial<MenuBarDisplaySettings> | null | undefined,
): MenuBarDisplaySettings {
  const numericCount = Number(value?.eventCount);
  const eventCount =
    Number.isFinite(numericCount) && VALID_EVENT_COUNTS.has(numericCount)
      ? numericCount
      : DEFAULT_MENU_BAR_DISPLAY_SETTINGS.eventCount;

  const dateStyle: MenuBarDateStyle =
    value?.dateStyle === "month-day" ? "month-day" : "day-month";

  const rowLayout: MenuBarRowLayout = (() => {
    switch (value?.rowLayout) {
      case "date-time-title":
      case "date-title-time":
      case "time-date-title":
      case "time-title-date":
      case "title-date-time":
      case "title-time-date":
        return value.rowLayout;
      default:
        return DEFAULT_MENU_BAR_DISPLAY_SETTINGS.rowLayout;
    }
  })();

  return {
    onlyMeetings: Boolean(value?.onlyMeetings),
    eventCount,
    dateStyle,
    rowLayout,
  };
}

function parseStoredSettings(
  raw: string | undefined,
): MenuBarDisplaySettings | null {
  if (!raw) return null;

  try {
    return normaliseMenuBarDisplaySettings(
      JSON.parse(raw) as Partial<MenuBarDisplaySettings>,
    );
  } catch {
    return null;
  }
}

function settingsEqual(
  a: MenuBarDisplaySettings | null | undefined,
  b: MenuBarDisplaySettings,
): boolean {
  return Boolean(
    a &&
    a.onlyMeetings === b.onlyMeetings &&
    a.eventCount === b.eventCount &&
    a.dateStyle === b.dateStyle &&
    a.rowLayout === b.rowLayout,
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function readMenuBarDisplaySettings(): Promise<MenuBarDisplaySettings> {
  const stored = parseStoredSettings(
    await LocalStorage.getItem<string>(DISPLAY_SETTINGS_KEY),
  );
  if (stored) return stored;

  const [onlyMeetings, eventCount, dateStyle, rowLayout] = await Promise.all([
    LocalStorage.getItem<boolean>(LEGACY_ONLY_MEETINGS_KEY),
    LocalStorage.getItem<number | string>(LEGACY_EVENT_COUNT_KEY),
    LocalStorage.getItem<MenuBarDateStyle>(LEGACY_DATE_STYLE_KEY),
    LocalStorage.getItem<MenuBarRowLayout>(LEGACY_ROW_LAYOUT_KEY),
  ]);

  const migrated = normaliseMenuBarDisplaySettings({
    onlyMeetings: Boolean(onlyMeetings),
    eventCount: eventCount === undefined ? undefined : Number(eventCount),
    dateStyle,
    rowLayout,
  });

  await LocalStorage.setItem(DISPLAY_SETTINGS_KEY, JSON.stringify(migrated));
  return migrated;
}

export async function writeMenuBarDisplaySettings(
  settings: MenuBarDisplaySettings,
): Promise<MenuBarDisplaySettings> {
  const normalised = normaliseMenuBarDisplaySettings(settings);
  const serialised = JSON.stringify(normalised);

  // Raycast LocalStorage is normally immediately readable after setItem, but
  // the settings command and the persistent menu-bar command can be alive at
  // the same time. A single immediate read-back can therefore briefly observe
  // the previous value and produce a false "did not persist" error.
  //
  // Write the complete atomic record, then verify it a few times with short
  // back-offs. Re-write the same complete record before each retry so a stale
  // concurrent writer cannot win permanently. We only report success after a
  // read returns all four fields exactly as requested.
  const retryDelays = [0, 25, 75, 175, 350];

  for (const retryDelay of retryDelays) {
    if (retryDelay > 0) await delay(retryDelay);

    await LocalStorage.setItem(DISPLAY_SETTINGS_KEY, serialised);

    const verifiedRaw =
      await LocalStorage.getItem<string>(DISPLAY_SETTINGS_KEY);
    const verified = parseStoredSettings(verifiedRaw);

    if (settingsEqual(verified, normalised)) {
      return verified as MenuBarDisplaySettings;
    }
  }

  throw new Error(
    "Menu bar display settings could not be verified after multiple attempts.",
  );
}

export async function updateMenuBarDisplaySettings(
  patch: Partial<MenuBarDisplaySettings>,
): Promise<MenuBarDisplaySettings> {
  const current = await readMenuBarDisplaySettings();
  return writeMenuBarDisplaySettings({ ...current, ...patch });
}
