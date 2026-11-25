import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/** Live 的 Set 文件后缀，模板也是这个后缀。 */
const TEMPLATE_EXTENSION = ".als";

/** 模板文件夹里的一个模板。name 是去掉后缀的显示名，path 是模板本身的路径。 */
export type Template = { name: string; path: string };

/** 一组模板。title 为 null 表示模板文件夹顶层的那一组，标题由界面补上。 */
export type TemplateGroup = { title: string | null; templates: Template[] };

/** 没设 Templates Folder 时用的模板文件夹：Live 自己的模板位置。 */
export function defaultTemplatesFolder(): string {
  return path.join(os.homedir(), "Music", "Ableton", "User Library", "Templates");
}

/** 模板就是一个 .als 文件。 */
export function isTemplate(entryPath: string, entryName: string): boolean {
  if (!entryName.endsWith(TEMPLATE_EXTENSION)) return false;
  try {
    return fs.statSync(entryPath).isFile();
  } catch {
    return false;
  }
}

function sortByName(templates: Template[]): Template[] {
  return [...templates].sort((a, b) => a.name.localeCompare(b.name));
}

// 只读一层：子文件夹里的模板算一组，再往下不找。
function templatesIn(folder: string, isTemplate: (entryPath: string, entryName: string) => boolean): Template[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(folder, { withFileTypes: true });
  } catch {
    return [];
  }
  const templates: Template[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const entryPath = path.join(folder, entry.name);
    if (isTemplate(entryPath, entry.name)) templates.push({ name: path.parse(entry.name).name, path: entryPath });
  }
  return sortByName(templates);
}

/**
 * 列出模板文件夹里的模板：顶层的算一组，每个直接子文件夹各算一组，不再往下深入。
 * 模板本身（.als 文件）由 isTemplate 认出来，不会被当成子文件夹进去扫描。
 * 文件夹不存在或读不到时返回空。
 */
export function listTemplates(
  folder: string,
  isTemplate: (entryPath: string, entryName: string) => boolean,
): TemplateGroup[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(folder, { withFileTypes: true });
  } catch {
    return [];
  }

  const top: Template[] = [];
  const groups: TemplateGroup[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const entryPath = path.join(folder, entry.name);
    // 先认模板：认成模板后就不再进去扫描。
    if (isTemplate(entryPath, entry.name)) {
      top.push({ name: path.parse(entry.name).name, path: entryPath });
      continue;
    }
    if (!entry.isDirectory()) continue;
    const templates = templatesIn(entryPath, isTemplate);
    if (templates.length > 0) groups.push({ title: entry.name, templates });
  }

  groups.sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));
  return top.length > 0 ? [{ title: null, templates: sortByName(top) }, ...groups] : groups;
}
