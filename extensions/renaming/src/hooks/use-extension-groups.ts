/**
 * Extension detection and per-extension grouping for independent numbering.
 */

import { useState, useCallback, useMemo } from "react";
import { dirname } from "path";
import type { FileInfo } from "../types";

export interface ExtGrouping {
  fileGroupIndices: number[];
  fileGroupSizes: number[];
  fileGroupKeys: string[];
}

export interface UseExtensionGroupsResult {
  detectedExtensions: Array<{ ext: string; count: number }>;
  hasMultipleExtensions: boolean;
  extensionOverrides: Map<string, string>;
  setExtensionMode: (ext: string, mode: "include" | "custom") => void;
  setExtensionBaseName: (ext: string, name: string) => void;
  extGrouping: ExtGrouping | null;
}

export function useExtensionGroups({
  files,
  independentNumbering,
}: {
  files: FileInfo[];
  independentNumbering: boolean;
}): UseExtensionGroupsResult {
  const [extensionOverrides, setExtensionOverrides] = useState<Map<string, string>>(new Map());

  const detectedExtensions = useMemo(() => {
    if (files.length === 0) return [];
    const counts = new Map<string, number>();
    for (const file of files) {
      if (file.isDirectory) continue;
      const ext = file.extension.toLowerCase();
      if (ext) counts.set(ext, (counts.get(ext) || 0) + 1);
    }
    return [...counts.entries()].sort(([, a], [, b]) => b - a).map(([ext, count]) => ({ ext, count }));
  }, [files]);

  const hasMultipleExtensions = detectedExtensions.length >= 2;

  const setExtensionMode = useCallback((ext: string, mode: "include" | "custom") => {
    if (mode === "include") {
      setExtensionOverrides((prev) => {
        const next = new Map(prev);
        next.delete(ext);
        return next;
      });
    } else {
      setExtensionOverrides((prev) => {
        if (prev.has(ext)) return prev;
        const next = new Map(prev);
        next.set(ext, "");
        return next;
      });
    }
  }, []);

  const setExtensionBaseName = useCallback((ext: string, name: string) => {
    setExtensionOverrides((prev) => {
      const next = new Map(prev);
      next.set(ext, name);
      return next;
    });
  }, []);

  const extGrouping = useMemo(() => {
    if (extensionOverrides.size === 0 && !independentNumbering) return null;

    const groupSizes = new Map<string, number>();
    const groupCounters = new Map<string, number>();
    const fileGroupIndices: number[] = [];
    const fileGroupSizes: number[] = [];
    const fileGroupKeys: string[] = [];

    function extKey(ext: string): string {
      if (extensionOverrides.has(ext) || independentNumbering) return ext;
      return "__default__";
    }

    function groupKey(file: FileInfo): string {
      const ext = file.extension.toLowerCase();
      const dir = dirname(file.path);
      return `${dir}\0${extKey(ext)}`;
    }

    // First pass: compute group sizes
    for (const file of files) {
      const key = groupKey(file);
      groupSizes.set(key, (groupSizes.get(key) || 0) + 1);
    }

    // Second pass: assign per-group indices
    for (const file of files) {
      const ext = file.extension.toLowerCase();
      const key = groupKey(file);
      const ek = extKey(ext);
      const idx = groupCounters.get(key) || 0;
      groupCounters.set(key, idx + 1);
      fileGroupIndices.push(idx);
      fileGroupSizes.push(groupSizes.get(key) || 1);
      fileGroupKeys.push(ek);
    }

    return { fileGroupIndices, fileGroupSizes, fileGroupKeys };
  }, [files, extensionOverrides, independentNumbering]);

  return {
    detectedExtensions,
    hasMultipleExtensions,
    extensionOverrides,
    setExtensionMode,
    setExtensionBaseName,
    extGrouping,
  };
}
