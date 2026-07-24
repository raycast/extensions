import { getPreferenceValues, open, environment } from "@raycast/api";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  BUILT_IN_CATEGORIES,
  CategoryOption,
  isBuiltInCategory,
  mergeCategoryOptions,
  parseFocusCategoriesExport,
  titleFromSlug,
} from "./categories";
import {
  loadCustomCategories,
  loadSchedules,
  rememberCustomCategories,
} from "./storage";

export type FocusSchedulerPreferences = {
  categoriesExportPath?: string;
};

const SUPPORT_CATEGORIES_FILE = "focus-categories.json";

export function supportCategoriesPath(): string {
  return join(environment.supportPath, SUPPORT_CATEGORIES_FILE);
}

export async function loadCategoriesFromFile(
  path: string,
): Promise<CategoryOption[]> {
  const raw = await readFile(path, "utf8");
  return parseFocusCategoriesExport(raw);
}

/** Load categories from preference file and/or supportPath JSON, then persist. */
export async function syncCategoriesFromConfiguredFiles(): Promise<
  CategoryOption[]
> {
  const prefs = getPreferenceValues<FocusSchedulerPreferences>();
  const paths = [prefs.categoriesExportPath, supportCategoriesPath()].filter(
    (p): p is string => Boolean(p && p.trim()),
  );

  const imported: CategoryOption[] = [];
  for (const path of paths) {
    try {
      const cats = await loadCategoriesFromFile(path);
      imported.push(...cats);
    } catch {
      // File may not exist yet — ignore
    }
  }

  if (imported.length > 0) {
    return rememberCustomCategories(imported);
  }
  return loadCustomCategories();
}

export async function loadAllCategoryOptions(): Promise<CategoryOption[]> {
  // Prefer freshly synced file contents when available
  await syncCategoriesFromConfiguredFiles();

  const [custom, schedules] = await Promise.all([
    loadCustomCategories(),
    loadSchedules(),
  ]);
  const fromSchedules: CategoryOption[] = [];
  for (const schedule of schedules) {
    for (const id of schedule.categories) {
      if (isBuiltInCategory(id)) continue;
      fromSchedules.push({ id, title: titleFromSlug(id), kind: "custom" });
    }
  }
  return mergeCategoryOptions(BUILT_IN_CATEGORIES, custom, fromSchedules);
}

export async function openSupportFolder(): Promise<void> {
  await open(environment.supportPath);
}
