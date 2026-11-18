import fs from "node:fs";
import path from "node:path";
import { Cache } from "@raycast/api";
import type { Project } from "./types";
import { countBounces, resolveBouncesFolder } from "./bounces";
import { daw } from "@/daws";

const bounceCountCache = new Cache({ namespace: "bounce-count-cache" });

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

export function loadProjects(projectsRoot: string): Project[] {
  const projects: Project[] = [];

  for (const folder of fs.readdirSync(projectsRoot)) {
    try {
      const folderPath = path.join(projectsRoot, folder);
      const stats = fs.statSync(folderPath);

      if (!stats.isDirectory()) {
        continue;
      }

      const setFiles = fs.readdirSync(folderPath).filter((file) => file.endsWith(daw.projectFileExtension));

      if (setFiles.length === 0) {
        continue;
      }

      const latestSetModifiedAt = setFiles.reduce((latest, file) => {
        const setStats = fs.statSync(path.join(folderPath, file));
        return Math.max(latest, setStats.mtimeMs);
      }, 0);

      projects.push({
        id: folder,
        title: folder,
        folderPath,
        createdAt: stats.birthtimeMs,
        inode: stats.ino,
        modifiedAt: latestSetModifiedAt,
        stageId: null,
        genreIds: [],
        collectionIds: [],
        notes: "",
        lyrics: "",
        pinned: false,
        pinOrder: null,
        setsCount: setFiles.length,
        bouncesCount: cachedBouncesCount(folderPath),
        externalBounceFolders: [],
        externalBounceFiles: [],
      });
    } catch {
      // 跳过无法读取的条目
    }
  }

  return projects;
}
