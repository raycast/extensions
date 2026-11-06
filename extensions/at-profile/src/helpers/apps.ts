import { getErrorMessage } from "@chrismessina/raycast-kit/errors";
import { Icon, Image } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { App, AppEntry, CustomAppInput } from "../types";
import { defaultApps } from "../utils/default-apps";
import {
  getAppSettings,
  getCustomApps,
  getReferencedAppIds,
  setAppSettings,
  setCustomApps,
  withStorageLock,
} from "./storage";
import { generateAppValue, getTemplateOrigin, normalizeUrlTemplate, validateUrlTemplate } from "./url";

export function getAppFavicon(app: Pick<App, "urlTemplate">) {
  const origin = getTemplateOrigin(app.urlTemplate);
  return origin ? getFavicon(origin, { fallback: Icon.Globe, mask: Image.Mask.RoundedRectangle }) : Icon.Globe;
}

/**
 * Every app, default and custom, with its visibility. Apps without a stored setting are visible.
 */
export async function getAppEntries(): Promise<AppEntry[]> {
  const [customApps, settings] = await Promise.all([getCustomApps(), getAppSettings()]);
  const visibility = new Map(settings.map((setting) => [setting.value, setting.visible]));
  return [
    ...defaultApps.map((app) => ({ ...app, isDefault: true, visible: visibility.get(app.value) ?? true })),
    ...customApps.map((app) => ({ ...app, isDefault: false, visible: visibility.get(app.value) ?? true })),
  ];
}

/**
 * Find an app by ID, shown or hidden
 */
export async function findApp(value: string): Promise<App | undefined> {
  return defaultApps.find((app) => app.value === value) ?? (await getCustomApps()).find((app) => app.value === value);
}

export async function setAppVisibility(value: string, visible: boolean): Promise<void> {
  await mergeAppVisibility(new Map([[value, visible]]));
}

/**
 * Find a shown app by ID or name, ignoring case
 */
export async function findVisibleApp(query: string): Promise<AppEntry | undefined> {
  const normalized = query.trim().toLowerCase();
  const visible = (await getAppEntries()).filter((entry) => entry.visible);
  // An exact ID wins over a display name, so a custom app named like another app's ID can't shadow it
  return (
    visible.find((entry) => entry.value.toLowerCase() === normalized) ??
    visible.find((entry) => entry.name.toLowerCase() === normalized)
  );
}

/**
 * Set several apps' visibility in one write, keeping every other stored setting
 */
/**
 * @returns how many apps this showed and hid, counting only changes; an app with no stored setting is visible
 */
export async function mergeAppVisibility(updates: Map<string, boolean>): Promise<{ shown: number; hidden: number }> {
  const changes = { shown: 0, hidden: 0 };
  if (updates.size === 0) return changes;
  await withStorageLock(async () => {
    const merged = new Map((await getAppSettings()).map((setting) => [setting.value, setting.visible]));
    updates.forEach((visible, value) => {
      if ((merged.get(value) ?? true) !== visible) changes[visible ? "shown" : "hidden"]++;
      merged.set(value, visible);
    });
    await setAppSettings(Array.from(merged, ([value, visible]) => ({ value, visible })));
  });
  return changes;
}

function findSameService(urlTemplate: string, apps: App[], excludeValue?: string): App | undefined {
  const normalized = normalizeUrlTemplate(urlTemplate);
  return apps.find((app) => app.value !== excludeValue && normalizeUrlTemplate(app.urlTemplate) === normalized);
}

function uniqueValue(base: string, taken: Set<string>): string {
  let value = base;
  for (let suffix = 2; taken.has(value); suffix++) {
    value = `${base}-${suffix}`;
  }
  return value;
}

/**
 * @throws when the input is invalid; the message is written for the user
 */
function validateInput(input: CustomAppInput, apps: App[], excludeValue?: string) {
  if (!input.name.trim()) {
    throw new Error("App name is required");
  }
  const templateError = validateUrlTemplate(input.urlTemplate);
  if (templateError) {
    throw new Error(templateError);
  }
  const existing = findSameService(input.urlTemplate, apps, excludeValue);
  if (existing) {
    throw new Error(`"${existing.name}" already opens profiles on this site`);
  }
}

export function addCustomApp(input: CustomAppInput): Promise<App> {
  return withStorageLock(() => addCustomAppLocked(input));
}

async function addCustomAppLocked(input: CustomAppInput): Promise<App> {
  const customApps = await getCustomApps();
  const allApps = [...defaultApps, ...customApps];
  validateInput(input, allApps);

  const base = generateAppValue(input.urlTemplate);
  if (!base) {
    throw new Error("Couldn't make an ID from this URL template");
  }
  const app: App = {
    name: input.name.trim(),
    value: uniqueValue(base, new Set([...allApps.map((existing) => existing.value), ...(await getReferencedAppIds())])),
    urlTemplate: input.urlTemplate.trim(),
    placeholder: "username",
  };

  await setCustomApps([...customApps, app]);
  return app;
}

/**
 * Edit a custom app. Its ID stays the same, so History, stars and the remembered dropdown choice stay attached.
 */
export function updateCustomApp(value: string, input: CustomAppInput): Promise<App> {
  return withStorageLock(() => updateCustomAppLocked(value, input));
}

async function updateCustomAppLocked(value: string, input: CustomAppInput): Promise<App> {
  const customApps = await getCustomApps();
  const current = customApps.find((app) => app.value === value);
  if (!current) {
    throw new Error("App not found");
  }
  validateInput(input, [...defaultApps, ...customApps], value);

  const updated: App = { ...current, name: input.name.trim(), urlTemplate: input.urlTemplate.trim() };
  await setCustomApps(customApps.map((app) => (app.value === value ? updated : app)));
  return updated;
}

export async function removeCustomApp(value: string): Promise<void> {
  await withStorageLock(async () => {
    // Settings first, so a view reloading between the two writes never sees a setting without its app
    await setAppSettings((await getAppSettings()).filter((setting) => setting.value !== value));
    await setCustomApps((await getCustomApps()).filter((app) => app.value !== value));
  });
}

export type ImportedAppResult =
  | { status: "added"; value: string }
  | { status: "present"; value: string }
  | { status: "invalid"; error: string };

/**
 * Add an app from an import file. An app for a site that is already set up resolves to the existing app.
 */
export function importCustomApp(input: CustomAppInput): Promise<ImportedAppResult> {
  return withStorageLock(async () => {
    const templateError = validateUrlTemplate(input.urlTemplate);
    if (templateError) {
      return { status: "invalid", error: templateError };
    }
    const existing = findSameService(input.urlTemplate, [...defaultApps, ...(await getCustomApps())]);
    if (existing) {
      return { status: "present", value: existing.value };
    }
    try {
      const app = await addCustomAppLocked(input);
      return { status: "added", value: app.value };
    } catch (error) {
      return { status: "invalid", error: getErrorMessage(error) };
    }
  });
}
