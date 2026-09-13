/**
 * 通用 SQLite 数据库读取工具
 *
 * 所有基于 VS Code 内核的 IDE（VS Code、Trae、Antigravity 等）
 * 都使用相同的 state.vscdb 格式存储最近项目列表，
 * 因此查询和解析逻辑可以完全共享。
 */

import { execSync } from "child_process";
import { existsSync } from "fs";
import path from "path";
import type { IDEProvider, ProjectItem } from "../providers/types";

/**
 * 从候选路径列表中找到第一个存在的数据库文件
 */
export function resolveDatabasePath(provider: IDEProvider): string | null {
  for (const dbPath of provider.getDatabasePaths()) {
    if (existsSync(dbPath)) return dbPath;
  }
  return null;
}

/**
 * 查询 state.vscdb 并返回原始 JSON entries
 */
export function queryRecentEntries(dbPath: string): any[] {
  const queryCommand = `sqlite3 "${dbPath}" "SELECT value FROM ItemTable WHERE key = 'history.recentlyOpenedPathsList';"`;

  let rawResult = "";
  try {
    rawResult = execSync(queryCommand, { encoding: "utf-8" }).trim();
  } catch (e: any) {
    throw new Error(`SQLite 读取失败: ${e?.message || String(e)}`);
  }

  if (!rawResult) {
    throw new Error("成功读取数据库，但历史记录为空");
  }

  const jsonStartIndex = rawResult.indexOf("{");
  if (jsonStartIndex === -1) {
    throw new Error(`返回内容非合法 JSON: ${rawResult.slice(0, 50)}...`);
  }

  let jsonVal: any;
  try {
    jsonVal = JSON.parse(rawResult.slice(jsonStartIndex));
  } catch (e: any) {
    throw new Error(`JSON 解析失败: ${e?.message || "格式错误"}`);
  }

  const entries = jsonVal.entries || jsonVal.workspaces || [];
  if (!Array.isArray(entries) || entries.length === 0) {
    return [];
  }

  return entries;
}

/**
 * 将原始 entries 解析为 ProjectItem 列表
 */
export function parseEntries(entries: any[], sourceId: string): ProjectItem[] {
  return entries
    .filter((entry: any) =>
      Boolean(
        entry &&
        (typeof entry === "string" ||
          entry.folderUri ||
          entry.workspace?.configPath ||
          entry.fileUri ||
          entry.remoteAuthority),
      ),
    )
    .map((entry: any, index: number) => {
      let uriStr = "";
      let itemType: ProjectItem["type"] = "folder";

      if (typeof entry === "string") {
        uriStr = entry;
      } else if (entry.folderUri) {
        uriStr = entry.folderUri;
        itemType = "folder";
      } else if (entry.workspace?.configPath) {
        uriStr = entry.workspace.configPath;
        itemType = "workspace";
      } else if (entry.fileUri) {
        uriStr = entry.fileUri;
        itemType = "file";
      } else if (entry.remoteAuthority) {
        uriStr = entry.folderUri || entry.fileUri || "";
        itemType = "remote";
      }

      if (uriStr.startsWith("vscode-remote://")) {
        itemType = "remote";
      }

      const filePath = decodeURIComponent(uriStr.replace(/^file:\/\//, ""));
      const fileName = path.basename(filePath) || filePath;
      const ext = path.extname(filePath).toLowerCase().replace(".", "");

      const isRemote =
        itemType === "remote" || uriStr.startsWith("vscode-remote://");
      const exists = isRemote ? true : existsSync(filePath);

      return {
        id: `${sourceId}-${filePath}-${index}`,
        name: fileName,
        path: filePath,
        type: itemType,
        extension: ext,
        sources: [sourceId],
        exists,
      };
    });
}

/**
 * 从一个 IDE provider 加载所有最近项目
 */
export function loadProjectsFromProvider(provider: IDEProvider): ProjectItem[] {
  const dbPath = resolveDatabasePath(provider);
  if (!dbPath) return [];

  try {
    const entries = queryRecentEntries(dbPath);
    return parseEntries(entries, provider.id);
  } catch {
    return [];
  }
}

/**
 * 合并多个 provider 的项目列表，按路径去重，保留多来源
 */
export function mergeProjects(allProjects: ProjectItem[]): ProjectItem[] {
  const map = new Map<string, ProjectItem>();

  for (const project of allProjects) {
    const existing = map.get(project.path);
    if (existing) {
      // 合并来源，避免重复
      for (const src of project.sources) {
        if (!existing.sources.includes(src)) {
          existing.sources.push(src);
        }
      }
      if (project.exists !== undefined) {
        existing.exists = existing.exists ?? project.exists;
      }
    } else {
      map.set(project.path, { ...project });
    }
  }

  return Array.from(map.values());
}

/**
 * 提取条目的标准化路径
 */
export function getEntryPath(entry: any): string {
  let uriStr = "";
  if (typeof entry === "string") {
    uriStr = entry;
  } else if (entry.folderUri) {
    uriStr = entry.folderUri;
  } else if (entry.workspace?.configPath) {
    uriStr = entry.workspace.configPath;
  } else if (entry.fileUri) {
    uriStr = entry.fileUri;
  } else if (entry.remoteAuthority) {
    uriStr = entry.folderUri || entry.fileUri || "";
  }
  return decodeURIComponent(uriStr.replace(/^file:\/\//, ""));
}

/**
 * 从单个 IDE 的数据库中物理删除指定的路径列表（附带 .bak 备份）
 */
export function removePathsFromProviderDatabase(
  provider: IDEProvider,
  pathsToRemove: string[],
): { success: boolean; removedCount: number; error?: string } {
  const dbPath = resolveDatabasePath(provider);
  if (!dbPath) {
    return { success: false, removedCount: 0, error: "未找到数据库文件" };
  }

  const queryCommand = `sqlite3 "${dbPath}" "SELECT value FROM ItemTable WHERE key = 'history.recentlyOpenedPathsList';"`;

  let rawResult = "";
  try {
    rawResult = execSync(queryCommand, { encoding: "utf-8" }).trim();
  } catch (e: any) {
    return {
      success: false,
      removedCount: 0,
      error: `读取失败: ${e?.message}`,
    };
  }

  const jsonStartIndex = rawResult.indexOf("{");
  if (jsonStartIndex === -1) {
    return { success: false, removedCount: 0, error: "非合法 JSON" };
  }

  let jsonVal: any;
  try {
    jsonVal = JSON.parse(rawResult.slice(jsonStartIndex));
  } catch (e: any) {
    return {
      success: false,
      removedCount: 0,
      error: `JSON 解析失败: ${e?.message}`,
    };
  }

  const entriesKey = Array.isArray(jsonVal.entries)
    ? "entries"
    : Array.isArray(jsonVal.workspaces)
      ? "workspaces"
      : null;

  if (!entriesKey) {
    return { success: false, removedCount: 0, error: "未找到 entries 列表" };
  }

  const originalList: any[] = jsonVal[entriesKey];
  const removeSet = new Set(pathsToRemove.map((p) => path.normalize(p)));

  const filteredList = originalList.filter((entry) => {
    const p = getEntryPath(entry);
    return !removeSet.has(path.normalize(p));
  });

  const removedCount = originalList.length - filteredList.length;
  if (removedCount === 0) {
    return { success: true, removedCount: 0 };
  }

  // 自动备份原数据库
  try {
    const { copyFileSync } = require("fs");
    copyFileSync(dbPath, `${dbPath}.bak`);
  } catch {
    // 忽略备份异常
  }

  jsonVal[entriesKey] = filteredList;
  const updatedJson = JSON.stringify(jsonVal);
  const escapedJson = updatedJson.replace(/'/g, "''");

  const os = require("os");
  const fs = require("fs");
  const tmpSql = path.join(os.tmpdir(), `ide_recents_${Date.now()}.sql`);

  try {
    fs.writeFileSync(
      tmpSql,
      `UPDATE ItemTable SET value = '${escapedJson}' WHERE key = 'history.recentlyOpenedPathsList';\n`,
      "utf-8",
    );
    execSync(`sqlite3 "${dbPath}" < "${tmpSql}"`, { encoding: "utf-8" });
    return { success: true, removedCount };
  } catch (e: any) {
    return {
      success: false,
      removedCount: 0,
      error: `更新失败: ${e?.message}`,
    };
  } finally {
    try {
      fs.unlinkSync(tmpSql);
    } catch {
      // 忽略清理临时文件异常
    }
  }
}

/**
 * 从所有已注册 IDE 数据库中物理删除指定的路径列表
 */
export function removePathsFromAllDatabases(
  providers: IDEProvider[],
  pathsToRemove: string[],
): { totalRemoved: number; providerResults: Record<string, number> } {
  let totalRemoved = 0;
  const providerResults: Record<string, number> = {};

  for (const provider of providers) {
    const res = removePathsFromProviderDatabase(provider, pathsToRemove);
    if (res.success && res.removedCount > 0) {
      totalRemoved += res.removedCount;
      providerResults[provider.name] = res.removedCount;
    }
  }

  return { totalRemoved, providerResults };
}
