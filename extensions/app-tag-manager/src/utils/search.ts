import { AppInfo } from "../types";
import { toPinyin } from "./pinyin";

export function filterApps(apps: AppInfo[], searchText: string): AppInfo[] {
  if (!searchText) return apps;

  const search = searchText.toLowerCase();

  return apps.filter((app) => {
    const displayName = app.displayName.toLowerCase();
    const name = app.name.toLowerCase();
    const pinyin = toPinyin(app.displayName).toLowerCase();
    const tags = app.tags.join(" ").toLowerCase();

    return displayName.includes(search) || name.includes(search) || pinyin.includes(search) || tags.includes(search);
  });
}
