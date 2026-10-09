import { lstat, readdir } from "node:fs/promises";
import path from "node:path";
import { isLocalActivation, listSettingChoices, SETTING_FILES } from "./core-settings";

export type SourceCategory = "plugins" | "themes" | "snippets" | "settings";

export interface SourceItem {
  id: string;
  name: string;
  category: SourceCategory;
  sourcePath: string;
  description?: string;
  group?: string;
}

async function isExpected(pathname: string, kind: "file" | "directory"): Promise<boolean> {
  try {
    const stats = await lstat(pathname);
    return kind === "file" ? stats.isFile() : stats.isDirectory();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

/** Items allowed by 01_Configuration_Mapping.md. Symlinks in the Default Vault are excluded. */
export async function listSourceItems(defaultVault: string): Promise<SourceItem[]> {
  const obsidian = path.join(defaultVault, ".obsidian");
  if (!(await isExpected(obsidian, "directory"))) {
    throw new Error("The Default Vault needs a physical .obsidian directory.");
  }

  const items: SourceItem[] = [];
  for (const category of ["plugins", "themes", "snippets"] as const) {
    const folder = path.join(obsidian, category);
    if (!(await isExpected(folder, "directory"))) continue;
    const entries = await readdir(folder, { withFileTypes: true });
    for (const entry of entries) {
      const expected = category === "snippets" ? entry.name.endsWith(".css") && entry.isFile() : entry.isDirectory();
      if (!expected) continue;
      items.push({
        id: `${category}/${entry.name}`,
        name: entry.name,
        category,
        sourcePath: path.join(folder, entry.name),
      });
    }
  }
  for (const choice of await listSettingChoices(defaultVault)) {
    if (!choice.inDefault || isLocalActivation(choice.file, choice.name)) continue;
    items.push({
      id: choice.id,
      name: `${choice.title} · ${choice.label}`,
      category: "settings",
      sourcePath: path.join(obsidian, choice.file),
      description: choice.defaultValue,
      group: choice.title,
    });
  }
  return items.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    if (a.category === "settings" && b.category === "settings") {
      const first = SETTING_FILES.findIndex((file) => a.id.startsWith(`settings/${file.name}/`));
      const second = SETTING_FILES.findIndex((file) => b.id.startsWith(`settings/${file.name}/`));
      if (first !== second) return first - second;
    }
    return a.name.localeCompare(b.name);
  });
}
