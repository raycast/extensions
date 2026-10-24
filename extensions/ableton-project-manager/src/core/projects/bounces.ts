import { getPreferenceValues } from "@raycast/api";
import fs from "node:fs";
import path from "node:path";
import type { Project } from "./types";

export const AUDIO_EXTENSIONS = new Set([".wav", ".aif", ".aiff", ".mp3", ".m4a", ".flac"]);

export type Bounce = {
  name: string;
  path: string;
  createdAt: number;
  modifiedAt: number;
  size: number;
};

/** 按后缀判断是否为音频文件。 */
export function isAudioFile(fileName: string): boolean {
  return AUDIO_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

/** 根据偏好里的 Bounces 子文件夹名，解析某个项目的 bounces 所在目录。 */
export function resolveBouncesFolder(projectPath: string): string {
  const folderName = (getPreferenceValues<Preferences>().bouncesFolderName ?? "").trim();
  return folderName ? path.join(projectPath, folderName) : projectPath;
}

/**
 * 列出某目录「顶层」的全部 bounce，不递归子文件夹。
 * statSync 会跟随 symlink，所以链接到外部文件夹的 bounce 也能读到。
 */
export function listBounces(folderPath: string): Bounce[] {
  let entries: string[];
  try {
    entries = fs.readdirSync(folderPath);
  } catch {
    return [];
  }

  const bounces: Bounce[] = [];
  for (const entry of entries) {
    if (!isAudioFile(entry)) continue;
    const fullPath = path.join(folderPath, entry);
    try {
      const stats = fs.statSync(fullPath); // follows symlinks
      if (!stats.isFile()) continue;
      bounces.push({
        name: entry,
        path: fullPath,
        createdAt: stats.birthtimeMs,
        modifiedAt: stats.mtimeMs,
        size: stats.size,
      });
    } catch {
      continue;
    }
  }
  return bounces;
}

/** 统计某目录下的 bounce 数量：与 listBounces 口径一致（跟随 symlink、必须是文件），避免把同名目录当成音频。 */
export function countBounces(folderPath: string): number {
  return listBounces(folderPath).length;
}

/** 返回某目录下最近修改的 bounce 路径，没有则返回 null。
 *  用 mtime 而非 birthtime：重新导出覆盖同名文件时，修改时间才会更新。 */
export function findLatestBounce(folderPath: string): string | null {
  let latestPath: string | null = null;
  let latestModifiedAt = Number.NEGATIVE_INFINITY;

  for (const bounce of listBounces(folderPath)) {
    if (bounce.modifiedAt > latestModifiedAt) {
      latestModifiedAt = bounce.modifiedAt;
      latestPath = bounce.path;
    }
  }

  return latestPath;
}

// ───────────────── 外部 bounce 来源聚合 ─────────────────
// 默认 Bounces 文件夹 + 外部文件夹 + 外部文件，统一成带来源标记、去重后的列表。
// 所有 bounce 相关功能（Browse / Latest / Copy / 计数）都应改走这里。

export type BounceSourceKind = "project" | "external";

export type BounceWithSource = Bounce & {
  source: BounceSourceKind;
  /** false = 记录在案但当前读不到（如外接盘未连接 / 文件被删）。保留路径，不计入可用。 */
  available: boolean;
  /** 外部来源的登记路径（外部文件夹或外部文件）；默认目录的 bounce 为 undefined。用于按来源移除。 */
  externalSource?: string;
};

export type BounceSourceInput = {
  defaultFolder: string;
  externalFolders?: string[];
  externalFiles?: string[];
};

/** 规范化真实路径用于去重（跟随 symlink；失败时回退原路径）。 */
function canonicalPath(p: string): string {
  try {
    return fs.realpathSync(p);
  } catch {
    return p;
  }
}

function unavailablePlaceholder(p: string): Bounce {
  return { name: path.basename(p), path: p, createdAt: 0, modifiedAt: 0, size: 0 };
}

/**
 * 汇总一个项目的全部 bounce 来源。
 * - 默认目录标记 source:"project"，外部标记 source:"external"。
 * - 按规范化真实路径去重，默认目录优先（丢弃外部重复项）。
 * - 记录在案但读不到的外部来源，产出 available:false 占位（保留路径，不自动删除）。
 */
export function collectBounces(input: BounceSourceInput): BounceWithSource[] {
  const seen = new Set<string>();
  const result: BounceWithSource[] = [];

  const push = (bounce: Bounce, source: BounceSourceKind, available: boolean, externalSource?: string) => {
    const key = canonicalPath(bounce.path);
    if (seen.has(key)) return;
    seen.add(key);
    result.push({ ...bounce, source, available, externalSource });
  };

  // 1) 默认文件夹：优先占住去重键
  for (const bounce of listBounces(input.defaultFolder)) push(bounce, "project", true);

  // 2) 外部文件夹：实时扫描；路径读不到则整条记为不可用占位。externalSource 记文件夹本身，供整体移除。
  for (const folder of input.externalFolders ?? []) {
    try {
      fs.accessSync(folder);
    } catch {
      push(unavailablePlaceholder(folder), "external", false, folder);
      continue;
    }
    for (const bounce of listBounces(folder)) push(bounce, "external", true, folder);
  }

  // 3) 外部单文件：externalSource 即文件自身路径
  for (const file of input.externalFiles ?? []) {
    try {
      const stats = fs.statSync(file);
      // 不是文件、或不是音频：标成不可用，留在列表里方便移除，也不会被当成最新 bounce。
      if (!stats.isFile() || !isAudioFile(file)) {
        push(unavailablePlaceholder(file), "external", false, file);
        continue;
      }
      push(
        {
          name: path.basename(file),
          path: file,
          createdAt: stats.birthtimeMs,
          modifiedAt: stats.mtimeMs,
          size: stats.size,
        },
        "external",
        true,
        file,
      );
    } catch {
      push(unavailablePlaceholder(file), "external", false, file);
    }
  }

  return result;
}

/** 可用 bounce 数（默认 + 外部，去重后排除不可用）。 */
export function countBouncesWithSources(input: BounceSourceInput): number {
  return collectBounces(input).filter((bounce) => bounce.available).length;
}

/** 最近修改的可用 bounce 路径（含外部），没有则 null。 */
export function findLatestBounceWithSources(input: BounceSourceInput): string | null {
  let latestPath: string | null = null;
  let latestModifiedAt = Number.NEGATIVE_INFINITY;
  for (const bounce of collectBounces(input)) {
    if (!bounce.available) continue;
    if (bounce.modifiedAt > latestModifiedAt) {
      latestModifiedAt = bounce.modifiedAt;
      latestPath = bounce.path;
    }
  }
  return latestPath;
}

type ProjectBounceSources = Pick<Project, "folderPath" | "externalBounceFolders" | "externalBounceFiles">;

// 项目 → bounce 来源（默认文件夹 + 外部来源）。
function projectSources(project: ProjectBounceSources) {
  return {
    defaultFolder: resolveBouncesFolder(project.folderPath),
    externalFolders: project.externalBounceFolders,
    externalFiles: project.externalBounceFiles,
  };
}

/** 某个项目的最新 bounce。播放、复制、排队、分析都走这里，避免各处口径不一。 */
export function findLatestProjectBounce(project: ProjectBounceSources): string | null {
  return findLatestBounceWithSources(projectSources(project));
}

/** 某个项目的 bounce 数（去重、排除不可用）。 */
export function countProjectBounces(project: ProjectBounceSources): number {
  return countBouncesWithSources(projectSources(project));
}
