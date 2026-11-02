import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { Day } from "date-fns";
import {
  CustomProgressId,
  CustomProgressValue,
  PreferenceValues,
  Progress,
  ProgressFormValues,
  ProgressId,
  ProgressSnapshot,
} from "../types";
import { getDefaultProgress, getProgressNumByDate } from "./progress";
import { validateProgressForm } from "./validation";

const PREFIX = "progress:v2:";
const CUSTOM_PREFIX = `${PREFIX}custom:`;
const COMMAND_KEY = `${PREFIX}commandSelection`;
const MENU_KEY = `${PREFIX}menuBarSelection`;
const YEAR_ID = "default:year";

function object(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function validTimestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Number.isFinite(new Date(value).getTime());
}

function isCustomId(value: string): value is CustomProgressId {
  return value.startsWith("custom:") && value.length > "custom:".length;
}

function decodeCustom(value: unknown): CustomProgressValue | undefined {
  const record = object(value);
  if (
    !record ||
    typeof record.title !== "string" ||
    !record.title.trim() ||
    !validTimestamp(record.startDate) ||
    !validTimestamp(record.endDate) ||
    record.endDate <= record.startDate
  ) {
    return undefined;
  }
  return {
    title: record.title,
    menubarTitle:
      typeof record.menubarTitle === "string" && record.menubarTitle.trim() ? record.menubarTitle : record.title,
    startDate: record.startDate,
    endDate: record.endDate,
    initialMenuBarVisible: record.initialMenuBarVisible === true,
  };
}

// Legacy bytes remain the recovery source. Reads never migrate or repair storage by writing.
async function loadProgress(now: Date) {
  const stored = await LocalStorage.allItems();
  const storageWarnings: string[] = [];
  const parse = (value: unknown, key: string): unknown => {
    if (typeof value !== "string") {
      storageWarnings.push(`Could not read ${key}; its original value was preserved.`);
      return undefined;
    }
    try {
      return JSON.parse(value);
    } catch {
      storageWarnings.push(`Could not read ${key}; its original value was preserved.`);
      return undefined;
    }
  };
  const preference = Number(getPreferenceValues<PreferenceValues>().weekStartsOn);
  const weekStartsOn = Number.isInteger(preference) && preference >= 0 && preference <= 6 ? preference : 1;
  const defaults = getDefaultProgress(now, weekStartsOn as Day);
  const definitions = new Map<CustomProgressId, CustomProgressValue>();
  const legacyPins = new Map<ProgressId, boolean>();
  const legacyVisibility = new Map<ProgressId, boolean>();
  const legacyTitles = new Map<string, ProgressId>();
  let legacyCommand: ProgressId | undefined;
  let legacyMenu: ProgressId | undefined;

  if (stored.xProgress !== undefined) {
    const warningCount = storageWarnings.length;
    const legacy = object(parse(stored.xProgress, "xProgress"));
    if (legacy && Array.isArray(legacy.allProgress)) {
      legacy.allProgress.forEach((value: unknown, index: number) => {
        const record = object(value);
        if (!record || typeof record.title !== "string" || !record.title.trim()) {
          storageWarnings.push(`Could not recover saved progress ${index + 1}; its original value was preserved.`);
          return;
        }
        const builtin = record.type !== "user" && defaults.find((item) => item.title === record.title);
        const menubar = object(record.menubar);
        const id: ProgressId = builtin ? builtin.id : `custom:legacy:${index}`;
        if (!builtin) {
          const custom = decodeCustom({
            ...record,
            menubarTitle: menubar?.title,
            initialMenuBarVisible: menubar?.shown,
          });
          if (!custom) {
            storageWarnings.push(`Could not recover “${record.title}”; its original value was preserved.`);
            return;
          }
          definitions.set(id as CustomProgressId, custom);
        }
        if (typeof record.pinned === "boolean") legacyPins.set(id, record.pinned);
        if (typeof menubar?.shown === "boolean") legacyVisibility.set(id, menubar.shown);
        if (!legacyTitles.has(record.title)) legacyTitles.set(record.title, id);
        if (!legacyCommand && record.showAsCommand === true) legacyCommand = id;
      });
      if (typeof legacy.currMenubarProgressTitle === "string") {
        legacyMenu = legacyTitles.get(legacy.currMenubarProgressTitle);
      }
    } else if (storageWarnings.length === warningCount) {
      storageWarnings.push("Could not read the saved progress list; its original value was preserved.");
    }
  }

  for (const [key, raw] of Object.entries(stored)) {
    if (!key.startsWith(CUSTOM_PREFIX)) continue;
    const id = key.slice(CUSTOM_PREFIX.length);
    const warningCount = storageWarnings.length;
    const value = decodeCustom(parse(raw, key));
    if (isCustomId(id) && value) {
      definitions.set(id, value);
    } else if (storageWarnings.length === warningCount) {
      storageWarnings.push(`Could not recover ${key}; its original value was preserved.`);
    }
  }

  const booleanOverride = (key: string, fallback: boolean): boolean => {
    const value = stored[key];
    if (value === undefined) return fallback;
    if (typeof value === "boolean") return value;
    storageWarnings.push(`Could not read ${key}; its original value was preserved.`);
    return fallback;
  };
  const custom: Progress[] = [];
  for (const [id, value] of definitions) {
    // A separate permanent key makes deletion win even if an old editor writes afterward.
    if (booleanOverride(`${PREFIX}deleted:${id}`, false)) continue;
    custom.push({
      id,
      type: "user",
      title: value.title,
      startDate: value.startDate,
      endDate: value.endDate,
      progressNum: getProgressNumByDate(new Date(value.startDate), new Date(value.endDate), now),
      pinned: legacyPins.get(id) ?? false,
      menubar: { title: value.menubarTitle, shown: value.initialMenuBarVisible },
      showAsCommand: false,
    });
  }
  custom.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  const allProgress = [...defaults, ...custom].map(
    (progress): Progress => ({
      ...progress,
      pinned: booleanOverride(`${PREFIX}pinned:${progress.id}`, legacyPins.get(progress.id) ?? progress.pinned),
      menubar: {
        ...progress.menubar,
        shown: booleanOverride(
          `${PREFIX}visible:${progress.id}`,
          legacyVisibility.get(progress.id) ?? progress.menubar.shown
        ),
      },
    })
  );
  // Only an absent key inherits legacy selection; a stale explicit ID uses the fallback.
  const requestedCommand = stored[COMMAND_KEY] === undefined ? legacyCommand : stored[COMMAND_KEY];
  const requestedMenu = stored[MENU_KEY] === undefined ? legacyMenu : stored[MENU_KEY];
  const commandProgressId = allProgress.find((item) => item.id === requestedCommand)?.id ?? YEAR_ID;
  const currMenubarProgressId =
    allProgress.find((item) => item.id === requestedMenu && item.menubar.shown)?.id ??
    allProgress.find((item) => item.menubar.shown)?.id ??
    null;
  for (const item of allProgress) item.showAsCommand = item.id === commandProgressId;
  const snapshot: ProgressSnapshot = { allProgress, commandProgressId, currMenubarProgressId, storageWarnings };
  return { snapshot, stored, definitions };
}

export async function readProgress(now = new Date()): Promise<ProgressSnapshot> {
  return (await loadProgress(now)).snapshot;
}

export async function saveCustomProgress(
  id: CustomProgressId,
  values: ProgressFormValues,
  original?: Progress
): Promise<void> {
  if (!isCustomId(id) || (original && (original.id !== id || original.type !== "user"))) {
    throw new Error("Built-in progress cannot be edited.");
  }
  const { snapshot, stored, definitions } = await loadProgress(new Date());
  if (stored[`${PREFIX}deleted:${id}`] === true) throw new Error("This progress has been deleted.");
  const existing = snapshot.allProgress.find((item) => item.id === id);
  if ((original || id.startsWith("custom:legacy:")) && !existing) {
    throw new Error("This progress no longer exists. Reopen the list before editing it.");
  }
  const errors = validateProgressForm(values, snapshot.allProgress, id);
  if (Object.keys(errors).length) throw new Error(Object.values(errors).join(" "));
  if (!values.startDate || !values.endDate) throw new Error("Choose a start and end date.");
  const definition: CustomProgressValue = {
    title: values.title.trim(),
    menubarTitle: values.menubarTitle.trim(),
    startDate: values.startDate.getTime(),
    endDate: values.endDate.getTime(),
    initialMenuBarVisible: definitions.get(id)?.initialMenuBarVisible ?? values.showInMenubar,
  };
  await LocalStorage.setItem(`${CUSTOM_PREFIX}${id}`, JSON.stringify(definition));
  if (original && values.showInMenubar !== original.menubar.shown) {
    await LocalStorage.setItem(`${PREFIX}visible:${id}`, values.showInMenubar);
  }
  if (!original ? values.showAsCommand : values.showAsCommand !== original.showAsCommand) {
    if (values.showAsCommand) {
      await LocalStorage.setItem(COMMAND_KEY, id);
    } else if (snapshot.commandProgressId === id) {
      await LocalStorage.setItem(COMMAND_KEY, YEAR_ID);
    }
  }
}

async function requireProgress(id: ProgressId): Promise<Progress> {
  const item = (await readProgress()).allProgress.find((progress) => progress.id === id);
  if (!item) throw new Error("This progress no longer exists. Reopen the list to refresh it.");
  return item;
}

export async function deleteCustomProgress(id: CustomProgressId): Promise<void> {
  if (!isCustomId(id)) throw new Error("Built-in progress cannot be deleted.");
  // Tombstones are permanent and idempotent; no stale definition write can undo them.
  await LocalStorage.setItem(`${PREFIX}deleted:${id}`, true);
}

export async function setPinned(id: ProgressId, value: boolean): Promise<void> {
  await requireProgress(id);
  await LocalStorage.setItem(`${PREFIX}pinned:${id}`, value);
}

export async function setMenuBarVisible(id: ProgressId, value: boolean): Promise<void> {
  await requireProgress(id);
  await LocalStorage.setItem(`${PREFIX}visible:${id}`, value);
}

export async function selectCommand(id: ProgressId): Promise<void> {
  await requireProgress(id);
  await LocalStorage.setItem(COMMAND_KEY, id);
}

export async function selectMenuBar(id: ProgressId): Promise<void> {
  const item = await requireProgress(id);
  if (!item.menubar.shown) throw new Error("This progress is hidden from the menu bar.");
  await LocalStorage.setItem(MENU_KEY, id);
}
