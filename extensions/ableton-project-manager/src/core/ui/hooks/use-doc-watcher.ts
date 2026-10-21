import fs from "node:fs";
import path from "node:path";
import { useEffect, useRef } from "react";
import { docFilePath, getDocFolder, readDocFile, stripFrontmatter, type DocKind } from "@/core/docs/docs";
import type { Project } from "@/core/projects/types";

const DOC_KINDS: DocKind[] = ["notes", "lyrics"];
// 外部编辑器保存常是「写临时文件 → 改名替换」，一次保存会连发几个事件；按文件防抖，等写完再读。
const DEBOUNCE_MS = 150;

// 比较路径用：统一成绝对路径和同一种 Unicode 形式（文件系统事件给的名字可能是分解形式）。
function normalizePath(file: string): string {
  return path.resolve(file).normalize("NFC");
}

/** 命令打开期间监听笔记 / 歌词所在的文件夹，有 .md 变动就回调（已按文件防抖），参数是变动文件的绝对路径。
 *  设了自定义文件夹就监听它；存进项目文件夹时递归监听 Projects Folder。命令关闭即停止。 */
export function useDocWatcher(projectsRoot: string, onChange: (file: string) => void): void {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    // 文件夹 → 是否递归。两类文档指向同一处时只监听一次；有一类存进项目文件夹，Projects Folder 就得递归。
    const targets = new Map<string, boolean>();
    for (const kind of DOC_KINDS) {
      const folder = getDocFolder(kind);
      if (!folder) {
        targets.set(projectsRoot, true);
      } else if (!targets.has(folder)) {
        targets.set(folder, false);
      }
    }

    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    const watchers: fs.FSWatcher[] = [];
    for (const [folder, recursive] of targets) {
      try {
        const watcher = fs.watch(folder, { recursive }, (_event, filename) => {
          if (!filename || !filename.toLowerCase().endsWith(".md")) return;
          const file = path.join(folder, filename);
          clearTimeout(timers.get(file));
          timers.set(
            file,
            setTimeout(() => {
              timers.delete(file);
              onChangeRef.current(file);
            }, DEBOUNCE_MS),
          );
        });
        watcher.on("error", () => watcher.close());
        watchers.push(watcher);
      } catch {
        // 文件夹不存在（外接盘未挂载、自定义文件夹失效）：不监听，照常在重载时读。
      }
    }

    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
      for (const watcher of watchers) watcher.close();
    };
  }, [projectsRoot]);
}

/** 把 file 对应项目的那份文档重读进列表。没有项目用到这个文件、或内容没变时原样返回，不触发重渲染。 */
export function refreshDocFile(projects: Project[], file: string): Project[] {
  const target = normalizePath(file);
  let changed = false;
  const next = projects.map((p) => {
    for (const kind of DOC_KINDS) {
      if (normalizePath(docFilePath(p, kind)) !== target) continue;
      const body = stripFrontmatter(readDocFile(p, kind));
      if (body === p[kind]) return p;
      changed = true;
      return kind === "notes" ? { ...p, notes: body } : { ...p, lyrics: body };
    }
    return p;
  });
  return changed ? next : projects;
}
