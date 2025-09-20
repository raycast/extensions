import { Application } from "@raycast/api";
import { PREBUILT_CATEGORIES } from "../data/prebuilt-categories";

export function getRelevantPrebuiltCategories(installedApps: Application[]) {
  const installedBundleIds = new Set(installedApps.map((app) => app.bundleId));
  // Notice: type now matches new shape
  const relevantCategories: Record<string, { bundleId: string; name: string }[]> = {};

  for (const categoryName in PREBUILT_CATEGORIES) {
    const masterAppList = PREBUILT_CATEGORIES[categoryName as keyof typeof PREBUILT_CATEGORIES];

    // Filter on the bundleId property of each object
    const userAppsForCategory = masterAppList.filter((app) => installedBundleIds.has(app.bundleId));

    if (userAppsForCategory.length > 0) {
      relevantCategories[categoryName] = userAppsForCategory;
    }
  }
  return relevantCategories;
}
