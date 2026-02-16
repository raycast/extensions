/**
 * Directory-based file grouping for per-directory numbering.
 */

import { useMemo } from "react";
import { dirname } from "path";
import type { FileInfo } from "../types";

export interface DirGroups {
  fileIndices: number[];
  fileSizes: number[];
  dirCount: number;
}

export interface UseFileGroupingResult {
  dirGroups: DirGroups;
}

export function useFileGrouping({ files }: { files: FileInfo[] }): UseFileGroupingResult {
  const dirGroups = useMemo(() => {
    const groups = new Map<string, number>();

    for (const file of files) {
      const dir = dirname(file.path);
      groups.set(dir, (groups.get(dir) || 0) + 1);
    }

    const fileIndices: number[] = [];
    const fileSizes: number[] = [];
    const counters = new Map<string, number>();

    for (const file of files) {
      const dir = dirname(file.path);
      const idx = counters.get(dir) || 0;
      counters.set(dir, idx + 1);
      fileIndices.push(idx);
      fileSizes.push(groups.get(dir) || 1);
    }

    return { fileIndices, fileSizes, dirCount: groups.size };
  }, [files]);

  return { dirGroups };
}
