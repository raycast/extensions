import fs from "fs";
import path from "path";
import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  projectsFolder: string;
}

export async function createCategoryFolder(categoryName: string) {
  const preferences = getPreferenceValues<Preferences>();
  const categoryPath = path.join(preferences.projectsFolder, categoryName);

  if (!fs.existsSync(categoryPath)) {
    fs.mkdirSync(categoryPath, { recursive: true });
  }
  return categoryPath;
}

export async function ensureAllCategoryFolders(categories: { name: string; folderName: string }[]) {
  for (const category of categories) {
    await createCategoryFolder(category.folderName);
  }
}
