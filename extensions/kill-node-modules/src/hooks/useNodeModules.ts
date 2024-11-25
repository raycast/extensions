import { useEffect, useState, useCallback } from "react";
import { NodeModulesItem } from "../kill-node-modules";
import { readdir, stat } from "fs/promises";
import path from "path";
import os from "node:os";
import du from "du";

function isDangerous(path: string): boolean {
  const hiddenFilePattern = /(^|\/)\.[^/.]/g;
  const macAppsPattern = /(^|\/)Applications\/[^/]+\.app\//g;
  return hiddenFilePattern.test(path) || macAppsPattern.test(path);
}

const PAGE_SIZE = 20;

export function useNodeModules() {
  const [items, setItems] = useState<NodeModulesItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [queue, setQueue] = useState<string[]>([]);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const loadMore = useCallback(async () => {
    console.debug("loadMore called, queue length:", queue.length);
    if (queue.length === 0) {
      setHasMore(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    const batch: NodeModulesItem[] = [];
    let processedItems = 0;
    const newQueue = [...queue];

    while (newQueue.length > 0 && processedItems < PAGE_SIZE) {
      const currentPath = newQueue.shift()!;
      try {
        const files = await readdir(currentPath, { withFileTypes: true });
        for (const file of files) {
          if (file.isDirectory()) {
            const fullPath = path.join(currentPath, file.name);
            if (file.name === "node_modules" && !isDangerous(fullPath)) {
              const fileStats = await stat(fullPath);
              const size = await du(fullPath);
              batch.push({
                title: fullPath,
                lastModified: fileStats.mtime,
                id: fullPath,
                size: size,
              });
              processedItems++;
              if (processedItems >= PAGE_SIZE) break;
            } else if (!file.name.startsWith(".") && !fullPath.includes("node_modules")) {
              newQueue.push(fullPath);
            }
          }
        }
      } catch (error) {
        console.error(`Error reading directory ${currentPath}:`, error);
      }
    }

    setItems((prevItems) => [...prevItems, ...batch]);
    setQueue(newQueue);
    setLoading(false);
    setHasMore(newQueue.length > 0);
    console.debug("Loaded items:", batch.length, "Remaining in queue:", newQueue.length);
  }, [queue]);

  useEffect(() => {
    const homedir = os.homedir();
    setQueue([homedir]);
    console.debug("useNodeModules hook initialized");
  }, []);

  useEffect(() => {
    if (queue.length > 0 && items.length === 0) {
      console.debug("Initial load triggered");
      loadMore();
    }
  }, [queue, items, loadMore]);

  return {
    items,
    loading,
    pagination: {
      onLoadMore: loadMore,
      hasMore,
      pageSize: PAGE_SIZE,
    },
  };
}
