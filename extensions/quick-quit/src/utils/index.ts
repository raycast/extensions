import { Application } from "@raycast/api";
import { PREBUILT_CATEGORIES } from "../data/prebuilt-categories";

export function getRelevantPrebuiltCategories(installedApps: Application[]) {
  const installedAppNames = new Set(installedApps.map((app) => app.name));
  const relevantCategories: Record<string, string[]> = {};

  // Loop through each pre-built category (e.g., "Dev", "Write")
  for (const categoryName in PREBUILT_CATEGORIES) {
    const masterAppList = PREBUILT_CATEGORIES[categoryName as keyof typeof PREBUILT_CATEGORIES];

    // Find which apps from our master list are actually installed on the user's machine
    const userAppsForCategory = masterAppList.filter((appName) => installedAppNames.has(appName));

    // If the user has at least one app for this category, we consider it "relevant"
    if (userAppsForCategory.length > 0) {
      relevantCategories[categoryName] = userAppsForCategory;
    }
  }
  return relevantCategories;
}
