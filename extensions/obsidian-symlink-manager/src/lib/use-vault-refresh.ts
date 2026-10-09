import { watch, type FSWatcher } from "node:fs";
import path from "node:path";
import { useEffect, useRef } from "react";

/** Refresh a visible view when either vault's Obsidian configuration changes. */
export function useVaultRefresh(defaultVault: string, targetVault: string, refresh: () => unknown): void {
  const latestRefresh = useRef(refresh);
  latestRefresh.current = refresh;

  useEffect(() => {
    const watchers: FSWatcher[] = [];
    let timer: ReturnType<typeof setTimeout> | undefined;
    let active = true;
    const schedule = (event: string, filename: string | Buffer | null) => {
      if (filename) {
        const name = filename.toString().replace(/\\/g, "/");
        if (
          name.includes(".git/") ||
          name.includes("workspace") ||
          name.includes("cache/") ||
          name.includes("Cache/") ||
          name.includes("IndexedDB/") ||
          name.includes("obsidian.css") ||
          name.includes("plugins/obsidian-git")
        ) {
          return;
        }
      }
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (active) void latestRefresh.current();
      }, 500);
    };
    for (const vault of new Set([defaultVault, targetVault])) {
      try {
        const watcher = watch(path.join(vault, ".obsidian"), { recursive: true }, schedule);
        watcher.on("error", () => watcher.close());
        watchers.push(watcher);
      } catch {
        // A missing or temporarily inaccessible vault remains available to manual refresh.
      }
    }
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      for (const watcher of watchers) watcher.close();
    };
  }, [defaultVault, targetVault]);
}
