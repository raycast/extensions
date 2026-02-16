/**
 * Name generation algorithm, preview computation, and form validation.
 */

import { useCallback, useMemo } from "react";
import { basename, dirname } from "path";
import { transformCase } from "../lib/case-transform";
import { PREVIEW_LIMIT } from "../lib/constants";
import type { FileInfo } from "../types";
import type { UseRenameFormFieldsResult } from "./use-rename-form-fields";
import type { DirGroups } from "./use-file-grouping";
import type { ExtGrouping } from "./use-extension-groups";

export interface UseNameGeneratorOptions {
  files: FileInfo[];
  formFields: UseRenameFormFieldsResult;
  dirGroups: DirGroups;
  extGrouping: ExtGrouping | null;
  extensionOverrides: Map<string, string>;
  detectedExtensions: Array<{ ext: string; count: number }>;
}

export interface UseNameGeneratorResult {
  generateNewName: (file: FileInfo, globalIndex: number) => string;
  preview: string[];
  isFormValid: () => boolean;
}

export function useNameGenerator({
  files,
  formFields,
  dirGroups,
  extGrouping,
  extensionOverrides,
  detectedExtensions,
}: UseNameGeneratorOptions): UseNameGeneratorResult {
  const { newName, prefix, suffix, preserveName, separator, indexSeparator, startNumber, paddingDigits, caseStyle } =
    formFields;

  const generateNewName = useCallback(
    (file: FileInfo, globalIndex: number): string => {
      const prefixPart = prefix ? `${prefix}${separator}` : "";
      const suffixPart = suffix ? `${separator}${suffix}` : "";

      let effectiveBaseName: string;
      let groupIndex: number;
      let groupSize: number;
      let isSingleGroup: boolean;

      if (preserveName) {
        effectiveBaseName = file.baseName;
        groupIndex = 0;
        groupSize = 1;
        isSingleGroup = true;
      } else if (extGrouping) {
        const groupKey = extGrouping.fileGroupKeys[globalIndex] ?? "__default__";
        const isOverridden = groupKey !== "__default__";
        effectiveBaseName = isOverridden ? extensionOverrides.get(groupKey) || file.baseName : newName || file.baseName;
        groupIndex = extGrouping.fileGroupIndices[globalIndex] ?? globalIndex;
        groupSize = extGrouping.fileGroupSizes[globalIndex] ?? files.length;
        isSingleGroup = false;
      } else {
        effectiveBaseName = newName || file.baseName;
        groupIndex = dirGroups.fileIndices[globalIndex] ?? globalIndex;
        groupSize = dirGroups.fileSizes[globalIndex] ?? files.length;
        isSingleGroup = dirGroups.dirCount === 1;
      }

      const parsedPadding = parseInt(paddingDigits, 10);
      const totalDigits =
        paddingDigits === "0"
          ? String(groupSize).length
          : Number.isNaN(parsedPadding)
            ? String(groupSize).length
            : parsedPadding;
      const parsedStart = parseInt(startNumber, 10);
      const startNum = Number.isNaN(parsedStart) ? 1 : Math.max(0, parsedStart);
      const paddedIndex = String(startNum + groupIndex).padStart(totalDigits, "0");

      let newBaseName: string;
      if (preserveName) {
        newBaseName = `${prefixPart}${effectiveBaseName}${suffixPart}`;
      } else if (groupSize === 1 && isSingleGroup) {
        newBaseName = `${prefixPart}${effectiveBaseName}${suffixPart}`;
      } else {
        newBaseName = `${prefixPart}${effectiveBaseName}${indexSeparator}${paddedIndex}${suffixPart}`;
      }

      newBaseName = transformCase(newBaseName, caseStyle);

      return file.isDirectory ? newBaseName : `${newBaseName}${file.extension}`;
    },
    [
      files,
      dirGroups,
      extGrouping,
      extensionOverrides,
      newName,
      prefix,
      suffix,
      preserveName,
      separator,
      indexSeparator,
      startNumber,
      paddingDigits,
      caseStyle,
    ],
  );

  const preview = useMemo(() => {
    if (files.length === 0) return [];

    const previews: string[] = [];
    let previewedCount = 0;

    if (extGrouping) {
      const extFileGroups = new Map<string, Array<{ file: FileInfo; globalIndex: number }>>();
      for (let i = 0; i < files.length; i++) {
        const file = files[i]!;
        const ext = file.extension.toLowerCase() || "(no ext)";
        if (!extFileGroups.has(ext)) extFileGroups.set(ext, []);
        extFileGroups.get(ext)!.push({ file, globalIndex: i });
      }

      const groups = [...extFileGroups.entries()].sort(([, a], [, b]) => b.length - a.length);
      const perGroup = Math.ceil(PREVIEW_LIMIT / Math.max(groups.length, 1));
      let remaining = PREVIEW_LIMIT;

      for (const [ext, entries] of groups) {
        if (remaining <= 0) break;
        const count = Math.min(perGroup, remaining, entries.length);
        const isOverridden = extensionOverrides.has(ext);
        previews.push(`${ext.toUpperCase()}${isOverridden ? " ✦" : ""}:`);
        for (let j = 0; j < count; j++) {
          const { file, globalIndex } = entries[j]!;
          const newFileName = generateNewName(file, globalIndex);
          previews.push(`  ${file.name} → ${newFileName}`);
          remaining--;
          previewedCount++;
        }
        if (entries.length > count) {
          previews.push(`  ...and ${entries.length - count} more`);
        }
      }
    } else {
      const dirFileGroups = new Map<string, Array<{ file: FileInfo; globalIndex: number }>>();
      for (let i = 0; i < files.length; i++) {
        const file = files[i]!;
        const dir = dirname(file.path);
        if (!dirFileGroups.has(dir)) dirFileGroups.set(dir, []);
        dirFileGroups.get(dir)!.push({ file, globalIndex: i });
      }

      if (dirFileGroups.size > 1) {
        const dirs = [...dirFileGroups.entries()];
        const perDir = Math.ceil(PREVIEW_LIMIT / dirs.length);
        let remaining = PREVIEW_LIMIT;

        for (const [dir, entries] of dirs) {
          if (remaining <= 0) break;
          const count = Math.min(perDir, remaining, entries.length);
          previews.push(`${basename(dir)}/`);
          for (let j = 0; j < count; j++) {
            const { file, globalIndex } = entries[j]!;
            const newFileName = generateNewName(file, globalIndex);
            previews.push(`  ${file.name} → ${newFileName}`);
            remaining--;
            previewedCount++;
          }
          if (entries.length > count) {
            previews.push(`  ...and ${entries.length - count} more`);
          }
        }
      } else {
        const count = Math.min(files.length, PREVIEW_LIMIT);
        for (let i = 0; i < count; i++) {
          const file = files[i]!;
          const newFileName = generateNewName(file, i);
          previews.push(`${file.name} → ${newFileName}`);
          previewedCount++;
        }
      }
    }

    if (files.length > previewedCount) {
      previews.push(`...and ${files.length - previewedCount} more files`);
    }

    return previews;
  }, [files, generateNewName, extGrouping, extensionOverrides]);

  const isFormValid = useCallback((): boolean => {
    if (files.length === 0) return false;
    if (preserveName) return true;

    if (extensionOverrides.size > 0) {
      for (const [ext, baseName] of extensionOverrides) {
        const normalizedExt = ext.toLowerCase();
        const count = detectedExtensions.find((d) => d.ext.toLowerCase() === normalizedExt)?.count ?? 0;
        if (count > 1 && !baseName.trim()) return false;
      }
      const defaultCount = files.filter((f) => !extensionOverrides.has(f.extension.toLowerCase())).length;
      if (defaultCount > 1 && !newName.trim()) return false;
      if (defaultCount === 0) return true;
    }

    if (files.length > 1 && !newName.trim()) return false;
    return true;
  }, [files, preserveName, newName, extensionOverrides, detectedExtensions]);

  return { generateNewName, preview, isFormValid };
}
