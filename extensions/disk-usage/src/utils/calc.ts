import path from "node:path";
import type { FileSystemIndex, Volume } from "../types";
import { formatSize } from "./format";

export const adjustVolume = (volume: Volume, freedBytes: number): Volume => {
  const free = volume.freeBytes + freedBytes;
  const used = volume.totalBytes - free;

  const usagePercent = volume.totalBytes > 0 ? Math.round((used / volume.totalBytes) * 100) : 0;

  return {
    ...volume,
    freeBytes: free,
    usageLabel: `${usagePercent}%`,
  };
};

export const pruneFileSystemIndex = (
  index: FileSystemIndex,
  pathsToRemove: string[],
  rootDir: string,
): { index: FileSystemIndex; freedBytes: number } => {
  const normalizedHome = path.normalize(rootDir);
  const pathsSet = new Set(pathsToRemove.map((p) => path.normalize(p)));

  let totalFreed = 0;

  const sizeAdjustments = new Map<string, number>();

  Object.values(index).forEach((snapshot) => {
    snapshot.accessible.forEach((node) => {
      if (pathsSet.has(node.path)) {
        totalFreed += node.bytes;

        let currentParent = path.normalize(path.dirname(node.path));

        while (currentParent.startsWith(normalizedHome)) {
          sizeAdjustments.set(currentParent, (sizeAdjustments.get(currentParent) ?? 0) + node.bytes);

          if (currentParent === normalizedHome) break;

          const nextParent = path.normalize(path.dirname(currentParent));
          if (nextParent === currentParent) break;
          currentParent = nextParent;
        }
      }
    });
  });

  const newIndex: FileSystemIndex = {};

  for (const [folderPath, snapshot] of Object.entries(index)) {
    if (pathsSet.has(folderPath)) continue;

    const newAccessible = snapshot.accessible
      .filter((node) => !pathsSet.has(node.path))
      .map((node) => {
        const adjustment = sizeAdjustments.get(node.path);

        if (adjustment) {
          const newBytes = Math.max(0, node.bytes - adjustment);
          return {
            ...node,
            bytes: newBytes,
            formattedSize: formatSize(newBytes),
          };
        }
        return node;
      })
      .sort((a, b) => b.bytes - a.bytes);

    const newRestricted = snapshot.restricted.filter((node) => !pathsSet.has(node.path));

    if (newAccessible.length > 0 || newRestricted.length > 0) {
      newIndex[folderPath] = {
        accessible: newAccessible,
        restricted: newRestricted,
      };
    }
  }

  return { index: newIndex, freedBytes: totalFreed };
};
