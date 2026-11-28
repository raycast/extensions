import fs from "node:fs";
import path from "node:path";
import { Cache } from "@raycast/api";
import type { Project } from "./types";
import {
  countBounces,
  countBouncesWithSources,
  resolveBouncesFolder,
  setSharedBounceTitles,
  sharedBounceFilesFor,
} from "./bounces";
import { daw } from "@/daws";
import { LOG_PREFIX } from "@/core/log";

const bounceCountCache = new Cache({ namespace: "bounce-count-cache" });

/** 清掉整个 bounce 计数缓存（开发用）。 */
export function clearBounceCountCache(): void {
  bounceCountCache.clear();
}

// 用 Bounces 文件夹的 mtime 做 key 缓存计数：只有增删 Bounce 才会改 mtime，
// 一失效即重新扫描，结果始终正确，重复打开时省去再次 readdir。
function cachedBouncesCount(folderPath: string): number {
  const bouncesFolder = resolveBouncesFolder(folderPath);
  let key: string;
  try {
    key = `${bouncesFolder}:${fs.statSync(bouncesFolder).mtimeMs}`;
  } catch {
    return countBounces(bouncesFolder);
  }
  const cached = bounceCountCache.get(key);
  if (cached !== undefined) {
    return Number(cached);
  }
  const count = countBounces(bouncesFolder);
  bounceCountCache.set(key, String(count));
  return count;
}

// 默认文件夹计数 + 共享文件夹里分给这个项目的。没有共享 bounce 时直接用缓存的计数。
function projectBouncesCount(project: Pick<Project, "title" | "folderPath">): number {
  const sharedFiles = sharedBounceFilesFor(project.title);
  if (sharedFiles.length === 0) return cachedBouncesCount(project.folderPath);
  return countBouncesWithSources({ defaultFolder: resolveBouncesFolder(project.folderPath), sharedFiles });
}

export function loadProjects(projectsRoot: string): Project[] {
  const projects: Project[] = [];
  const seen = new Set<string>();

  for (const entry of fs.readdirSync(projectsRoot)) {
    try {
      const detected = daw.detectProject(path.join(projectsRoot, entry), entry);
      if (!detected) continue;

      const sets = daw.listSets(detected);
      if (sets.length === 0) continue;

      // 两个条目换算出同一个 id（如同名的文件夹和工程包）：只认第一个，否则元数据会混在一起。
      if (seen.has(detected.id)) {
        console.warn(`${LOG_PREFIX} Skipped duplicate project: ${detected.folderPath}`);
        continue;
      }
      seen.add(detected.id);

      const stats = fs.statSync(detected.folderPath);

      projects.push({
        id: detected.id,
        title: detected.id,
        folderPath: detected.folderPath,
        kind: detected.kind,
        createdAt: stats.birthtimeMs,
        inode: stats.ino,
        modifiedAt: Math.max(...sets.map((set) => set.modifiedAt)),
        stageId: null,
        genreIds: [],
        collectionIds: [],
        notes: "",
        lyrics: "",
        pinned: false,
        pinOrder: null,
        setsCount: sets.length,
        bouncesCount: 0, // 等全部项目都读完再算：共享文件夹按名字分配，要先知道所有项目名
        projectFilesCount: daw.countProjectFiles(detected),
        externalBounceFolders: [],
        externalBounceFiles: [],
      });
    } catch {
      // 跳过无法读取的条目
    }
  }

  setSharedBounceTitles(projects.map((project) => project.title));
  for (const project of projects) {
    try {
      project.bouncesCount = projectBouncesCount(project);
    } catch {
      // 读不到就保持 0
    }
  }

  return projects;
}
