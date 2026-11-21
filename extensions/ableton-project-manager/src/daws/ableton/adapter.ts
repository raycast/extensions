import fs from "node:fs";
import path from "node:path";
import { getSettings } from "@/settings";
import { getTemplateLabels } from "../labels";
import { getAlsMetadata } from "./als-metadata";
import { TemplatesView } from "./templates-view";
import type { DawAdapter, DawSet } from "../types";

const templateLabels = getTemplateLabels(getSettings().language);

/** Ableton 的 Set 文件后缀。 */
export const SET_EXTENSION = ".als";

/** Ableton Live 适配器：项目是一个文件夹，里面每个 .als 文件是一个 Set，元数据来自压缩的 ALS XML。 */
export const abletonAdapter: DawAdapter = {
  id: "ableton",
  appNameMatch: "ableton live",
  readmeUrl: "https://github.com/iyekChen/ableton-project-manager#combined-search",

  // 文件夹名就是 id，不需要换算。
  projectIdForEntry: (entryName) => entryName,
  entryNameFor: (title) => title,

  detectProject(entryPath, entryName) {
    try {
      if (!fs.statSync(entryPath).isDirectory()) return null;
    } catch {
      return null;
    }
    return { id: entryName, folderPath: entryPath, kind: "folder" };
  },

  listSets({ folderPath }) {
    let entries: string[];
    try {
      entries = fs.readdirSync(folderPath);
    } catch {
      return [];
    }

    const sets: DawSet[] = [];
    for (const entry of entries) {
      if (!entry.endsWith(SET_EXTENSION)) continue;
      const file = path.join(folderPath, entry);
      try {
        const stats = fs.statSync(file);
        if (!stats.isFile()) continue;
        sets.push({
          name: path.basename(entry, SET_EXTENSION),
          path: file,
          metadataFile: file,
          createdAt: stats.birthtimeMs,
          modifiedAt: stats.mtimeMs,
        });
      } catch {
        continue;
      }
    }
    return sets;
  },

  async parseSet(set) {
    const metadata = await getAlsMetadata(set.metadataFile);
    return {
      bpm: metadata.bpm,
      timeSignature: metadata.timeSignature,
      // inKey=false 表示工程未启用音阶，此时调性无意义，归一化为 null。
      key: metadata.inKey === false ? null : metadata.key,
    };
  },

  // 新建项目 Action 后面再加一个：进入模板列表。
  extraNewAction: {
    title: templateLabels.newProjectWithTemplate,
    // 和原来这个 Action 的图标一致（Icon.NewDocument）。适配层会被测试加载，那里没有 Icon，所以直接写图标名。
    icon: "new-document-16",
    shortcut: { modifiers: ["cmd", "opt", "ctrl"], key: "n" },
    component: TemplatesView,
  },
};
