/**
 * Composer hook for rename form logic.
 * Wires together focused sub-hooks and preserves the UseRenameFormResult API.
 *
 * Used by both rename.tsx and clipboard-rename.tsx.
 */

import { useSelectedFiles } from "./use-selected-files";
import { useRenameFormFields } from "./use-rename-form-fields";
import { useFileGrouping } from "./use-file-grouping";
import { useExtensionGroups } from "./use-extension-groups";
import { useNameGenerator } from "./use-name-generator";
import { useRenameOperations } from "./use-rename-operations";
import { CaseStyle, type RenameResult, type FileInfo, type SelectionMode } from "../types";

export interface UseRenameFormOptions {
  mode: SelectionMode;
  /** Additional loading state (e.g., clipboard loading) */
  extraIsLoading?: boolean;
}

export interface UseRenameFormResult {
  // File state
  files: FileInfo[];
  isLoading: boolean;
  noFilesSelected: boolean;
  setFiles: (files: FileInfo[]) => void;

  // Form state
  newName: string;
  setNewName: (name: string) => void;
  prefix: string;
  setPrefix: (p: string) => void;
  suffix: string;
  setSuffix: (s: string) => void;
  preserveName: boolean;
  setPreserveName: (v: boolean) => void;
  separator: string;
  indexSeparator: string;
  startNumber: string;
  setStartNumber: (n: string) => void;
  paddingDigits: string;
  setPaddingDigits: (d: string) => void;
  caseStyle: CaseStyle;
  setCaseStyle: (c: CaseStyle) => void;
  handleSeparatorChange: (type: "separator" | "indexSeparator", value: string) => void;

  // Per-extension configuration
  detectedExtensions: Array<{ ext: string; count: number }>;
  hasMultipleExtensions: boolean;
  extensionOverrides: Map<string, string>;
  independentNumbering: boolean;
  setIndependentNumbering: (v: boolean) => void;
  setExtensionMode: (ext: string, mode: "include" | "custom") => void;
  setExtensionBaseName: (ext: string, name: string) => void;

  // Preview
  preview: string[];

  // Operations
  renameFiles: () => Promise<void>;
  handleClose: () => Promise<void>;
  handleUndo: () => Promise<void>;
  handleRetryFailed: () => Promise<void>;
  isFormValid: () => boolean;

  // Results
  operationResults: RenameResult[] | null;
  isProcessing: boolean;
}

export function useRenameForm({ mode, extraIsLoading }: UseRenameFormOptions): UseRenameFormResult {
  const { files, isLoading: filesLoading, noFilesSelected, setFiles } = useSelectedFiles(mode);
  const formFields = useRenameFormFields();
  const { dirGroups } = useFileGrouping({ files });
  const extensionGroups = useExtensionGroups({ files, independentNumbering: formFields.independentNumbering });
  const nameGenerator = useNameGenerator({
    files,
    formFields,
    dirGroups,
    extGrouping: extensionGroups.extGrouping,
    extensionOverrides: extensionGroups.extensionOverrides,
    detectedExtensions: extensionGroups.detectedExtensions,
  });
  const operations = useRenameOperations({
    files,
    mode,
    generateNewName: nameGenerator.generateNewName,
    isFormValid: nameGenerator.isFormValid,
    preview: nameGenerator.preview,
    setPreserveName: formFields.setPreserveName,
  });

  const isLoading = filesLoading || operations.isProcessing || (extraIsLoading ?? false);

  return {
    files,
    isLoading,
    noFilesSelected,
    setFiles,
    ...formFields,
    ...extensionGroups,
    ...nameGenerator,
    ...operations,
  };
}
