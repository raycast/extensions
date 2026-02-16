/**
 * Component for selecting files when none are selected in Finder
 */

import { Form, ActionPanel, Action, Icon } from "@raycast/api";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { pathsToFileInfos } from "../hooks/use-selected-files";
import { scanDirectoryForFiles, scanDirectoryRecursive, deduplicatePaths } from "../lib/files";
import { buildAutoSummary } from "../lib/selection-summary";
import { SelectionMode, type FileInfo } from "../types";
import { resolve } from "path";

/**
 * Remove paths that are subdirectories of other selected paths.
 * e.g. ["/Content", "/Content/Sub"] → ["/Content"]
 */
function pruneNestedPaths(paths: string[]): string[] {
  const resolved = paths.map((p) => resolve(p));
  return paths.filter((_, i) => !resolved.some((other, j) => j !== i && resolved[i]!.startsWith(other + "/")));
}

type SortOption = "none" | "name_asc" | "name_desc" | "modified_desc" | "modified_asc" | "size_asc" | "size_desc";

const SORT_OPTIONS: Array<{ value: SortOption; title: string }> = [
  { value: "none", title: "Original Order" },
  { value: "name_asc", title: "Name (A → Z)" },
  { value: "name_desc", title: "Name (Z → A)" },
  { value: "modified_desc", title: "Date Modified (newest first)" },
  { value: "modified_asc", title: "Date Modified (oldest first)" },
  { value: "size_asc", title: "Size (smallest first)" },
  { value: "size_desc", title: "Size (largest first)" },
];

interface FileSelectionFormProps {
  onFilesSelected: (files: FileInfo[]) => void;
  mode?: SelectionMode;
}

export function FileSelectionForm({ onFilesSelected, mode = SelectionMode.ALL }: FileSelectionFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [includeSubdirs, setIncludeSubdirs] = useState(false);
  const [resolvedFiles, setResolvedFiles] = useState<FileInfo[]>([]);
  const [selectedExtensions, setSelectedExtensions] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState<SortOption>("none");
  const [isScanning, setIsScanning] = useState(false);
  const [hasDirs, setHasDirs] = useState(false);

  // Ref to always access the latest state from any callback,
  // even if Raycast caches the handler from an earlier render
  const selectedPathsRef = useRef(selectedPaths);
  selectedPathsRef.current = selectedPaths;

  const isFolderMode = mode === "folders";

  // Accumulate paths across multiple picker sessions so selecting
  // folders from different locations doesn't drop previous picks,
  // while still allowing removal via the X button.
  const handlePickerChange = useCallback((newPaths: string[]) => {
    if (newPaths.length === 0) {
      setSelectedPaths([]);
      return;
    }
    setSelectedPaths((prev) => {
      // Detect removal: if every new path already exists in prev, the user
      // clicked X to remove an item — use the new value directly.
      const prevSet = new Set(prev.map((p) => p.toLowerCase()));
      const isRemoval = newPaths.every((p) => prevSet.has(p.toLowerCase()));
      if (isRemoval) return newPaths;

      // Otherwise the user added new items via the file picker — accumulate.
      const combined = [...prev, ...newPaths];
      const seen = new Set<string>();
      return combined.filter((p) => {
        const key = p.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    });
  }, []);

  // Resolve files when paths or includeSubdirs change
  useEffect(() => {
    if (selectedPaths.length === 0) {
      setResolvedFiles([]);
      setSelectedExtensions([]);
      setHasDirs(false);
      return;
    }

    let cancelled = false;
    setIsScanning(true);

    async function resolve() {
      try {
        const infos = await pathsToFileInfos(selectedPaths);
        if (cancelled) return;

        if (mode === "files") {
          const dirs = infos.filter((f) => f.isDirectory);
          const directFiles = infos.filter((f) => !f.isDirectory);
          setHasDirs(dirs.length > 0);

          if (dirs.length > 0) {
            // When scanning recursively, prune subdirs already covered by a parent dir
            const dirPaths = includeSubdirs ? pruneNestedPaths(dirs.map((d) => d.path)) : dirs.map((d) => d.path);
            const scannedPaths: string[] = [];
            for (const dirPath of dirPaths) {
              const scanFn = includeSubdirs ? scanDirectoryRecursive : scanDirectoryForFiles;
              const nested = await scanFn(dirPath);
              if (cancelled) return;
              scannedPaths.push(...nested);
            }
            const uniquePaths = deduplicatePaths([...directFiles.map((f) => f.path), ...scannedPaths]);
            const allInfos = await pathsToFileInfos(uniquePaths);
            if (cancelled) return;
            const files = allInfos.filter((f) => !f.isDirectory);
            setResolvedFiles(files);
            const exts = [...new Set(files.map((f) => f.extension.toLowerCase()).filter(Boolean))];
            setSelectedExtensions(exts);
          } else {
            setResolvedFiles(directFiles);
            const exts = [...new Set(directFiles.map((f) => f.extension.toLowerCase()).filter(Boolean))];
            setSelectedExtensions(exts);
          }
        } else if (mode === "folders") {
          const folders = infos.filter((f) => f.isDirectory);
          setHasDirs(true);
          setResolvedFiles(folders);
          setSelectedExtensions([]);
        } else {
          setHasDirs(infos.some((f) => f.isDirectory));
          setResolvedFiles(infos);
          const exts = [
            ...new Set(
              infos
                .filter((f) => !f.isDirectory)
                .map((f) => f.extension.toLowerCase())
                .filter(Boolean),
            ),
          ];
          setSelectedExtensions(exts);
        }
      } catch (err) {
        console.error("Failed to resolve file paths:", err);
        if (!cancelled) {
          setResolvedFiles([]);
          setHasDirs(false);
        }
      } finally {
        if (!cancelled) setIsScanning(false);
      }
    }

    resolve();
    return () => {
      cancelled = true;
    };
  }, [selectedPaths, includeSubdirs, mode]);

  // Detected extensions with counts (for TagPicker options)
  const detectedExtensions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of resolvedFiles) {
      if (f.isDirectory) continue;
      const ext = f.extension.toLowerCase();
      if (ext) counts.set(ext, (counts.get(ext) || 0) + 1);
    }
    return [...counts.entries()].sort(([, a], [, b]) => b - a).map(([ext, count]) => ({ ext, count }));
  }, [resolvedFiles]);

  const hasMultipleExtensions = detectedExtensions.length >= 2;

  // Filtered files based on selected extensions
  const filteredFiles = useMemo(() => {
    if (isFolderMode || selectedExtensions.length === 0) return resolvedFiles;
    const extSet = new Set(selectedExtensions);
    return resolvedFiles.filter((f) => f.isDirectory || extSet.has(f.extension.toLowerCase()));
  }, [resolvedFiles, selectedExtensions, isFolderMode]);

  // Summary text from filtered files
  const summaryText = useMemo(() => {
    if (filteredFiles.length === 0) {
      if (resolvedFiles.length > 0) return "All file types excluded";
      return "";
    }
    if (isFolderMode) {
      // Show full paths with ~ shorthand for home dir
      const home = process.env.HOME || "";
      return filteredFiles
        .map((f) => (home && f.path.startsWith(home) ? "~" + f.path.slice(home.length) : f.path))
        .join("\n");
    }
    return buildAutoSummary(filteredFiles);
  }, [filteredFiles, resolvedFiles, isFolderMode]);

  // Sort files for submission
  const applySorting = useCallback(
    (files: FileInfo[]): FileInfo[] => {
      if (sortOption === "none") return files;
      const sorted = [...files];
      const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

      switch (sortOption) {
        case "name_asc":
          sorted.sort((a, b) => collator.compare(a.name, b.name));
          break;
        case "name_desc":
          sorted.sort((a, b) => collator.compare(b.name, a.name));
          break;
        case "modified_desc":
          sorted.sort((a, b) => (b.modified?.getTime() ?? 0) - (a.modified?.getTime() ?? 0));
          break;
        case "modified_asc":
          sorted.sort((a, b) => (a.modified?.getTime() ?? 0) - (b.modified?.getTime() ?? 0));
          break;
        case "size_asc":
          sorted.sort((a, b) => (a.size ?? 0) - (b.size ?? 0));
          break;
        case "size_desc":
          sorted.sort((a, b) => (b.size ?? 0) - (a.size ?? 0));
          break;
      }
      return sorted;
    },
    [sortOption],
  );

  const handleSubmit = useCallback(async () => {
    const files = filteredFiles;
    if (files.length === 0) return;

    setIsLoading(true);
    try {
      const sorted = applySorting(files);
      onFilesSelected(sorted);
    } finally {
      setIsLoading(false);
    }
  }, [filteredFiles, applySorting, onFilesSelected]);

  const hasSelection = selectedPaths.length > 0;
  const hasFiles = filteredFiles.length > 0;
  const pickerTitle = isFolderMode ? "Folders" : "Files or Folders";

  const noSelectionText = isFolderMode
    ? "Select folders in Finder before opening this command, or choose folders below."
    : "Select files or a folder in Finder before opening this command, or choose below.";

  return (
    <Form
      isLoading={isLoading || isScanning}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={hasFiles ? "Continue" : isFolderMode ? "Add Folder(s)" : "Add File(s)"}
            icon={hasFiles ? Icon.ArrowRight : Icon.Plus}
            onSubmit={handleSubmit}
          />
          {hasSelection && (
            <>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => setSelectedPaths([...selectedPaths])}
              />
              {selectedPaths.map((p, idx) => (
                <Action.ShowInFinder
                  key={p}
                  path={p}
                  {...(idx === 0 ? { shortcut: { modifiers: ["cmd", "shift"], key: "o" } } : {})}
                />
              ))}
              <Action
                title="Clear Selection"
                icon={Icon.Trash}
                shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                onAction={() => setSelectedPaths([])}
              />
            </>
          )}
        </ActionPanel>
      }
    >
      {!hasSelection && <Form.Description title="No Files Selected" text={noSelectionText} />}

      <Form.FilePicker
        id="files"
        title={pickerTitle}
        allowMultipleSelection
        canChooseFiles={mode !== "folders"}
        canChooseDirectories
        value={selectedPaths}
        onChange={handlePickerChange}
      />

      {hasSelection && (
        <>
          <Form.Separator />
          <Form.Description title="Selection" text={isScanning ? "Scanning..." : summaryText || "No files found"} />

          {hasDirs && !isFolderMode && (
            <Form.Checkbox
              id="includeSubdirs"
              label="Include subdirectories"
              value={includeSubdirs}
              onChange={setIncludeSubdirs}
            />
          )}

          {hasMultipleExtensions && !isFolderMode && (
            <>
              <Form.Separator />
              <Form.TagPicker
                id="extensionFilter"
                title="File Types"
                value={selectedExtensions}
                onChange={setSelectedExtensions}
              >
                {detectedExtensions.map(({ ext, count }) => (
                  <Form.TagPicker.Item key={ext} value={ext} title={`${ext} (${count})`} />
                ))}
              </Form.TagPicker>
            </>
          )}

          {hasFiles && !isFolderMode && (
            <Form.Dropdown
              id="sortOrder"
              title="Sort Order"
              value={sortOption}
              onChange={(v) => setSortOption(v as SortOption)}
            >
              {SORT_OPTIONS.map(({ value, title }) => (
                <Form.Dropdown.Item key={value} value={value} title={title} />
              ))}
            </Form.Dropdown>
          )}
        </>
      )}
    </Form>
  );
}
