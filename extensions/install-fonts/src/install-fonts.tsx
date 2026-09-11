import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readdir, rm, stat, lstat, mkdir, copyFile, access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import os from "node:os";
import path from "node:path";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Action,
  ActionPanel,
  Detail,
  Form,
  closeMainWindow,
  getPreferenceValues,
  getSelectedFinderItems,
  Icon,
  List,
  openCommandPreferences,
  trash,
  showInFinder,
  showToast,
  Toast,
  PopToRootType,
} from "@raycast/api";

const execFileAsync = promisify(execFile);

const FONT_EXTENSIONS = new Set([".ttf", ".otf", ".ttc", ".otc"]);
const ZIP_EXTENSIONS = new Set([".zip"]);
const MAX_FILENAME_ATTEMPTS = 250;
const MAX_FONT_FILES_PER_INSTALL = 500;
const MAX_TOTAL_FONT_BYTES = 500 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 1000;
const MAX_ZIP_UNCOMPRESSED_BYTES = 500 * 1024 * 1024;
const FONT_LIBRARY_DIR = path.join(os.homedir(), "Library", "Fonts");

type DuplicateHandling = "ask" | "skip" | "overwrite" | "keep-both";

interface SourcePath {
  path: string;
  kind: "file" | "folder" | "zip";
}

interface FontCandidate {
  sourcePath: string;
  sourceRoot: string;
  fileName: string;
  relativePath: string;
}

interface PreparedInstall {
  sourcePaths: SourcePath[];
  fontCandidates: FontCandidate[];
  duplicates: FontCandidate[];
  tempDirs: string[];
}

interface WalkBudget {
  fileCount: number;
  totalBytes: number;
}

interface InstallResult {
  installed: Array<{ sourcePath: string; destinationPath: string }>;
  skipped: Array<{ sourcePath: string; reason: string }>;
  failed: Array<{ sourcePath: string; reason: string }>;
  trashed: string[];
  warnings: string[];
}

type Phase = "loading" | "chooseType" | "chooseFonts" | "needsChoice" | "installing" | "done" | "error";

async function runCommand(command: string, args: string[]) {
  return execFileAsync(command, args, {
    maxBuffer: 10 * 1024 * 1024,
  });
}

async function getFinderSelection(): Promise<string[]> {
  try {
    const selectedItems = await getSelectedFinderItems();
    if (selectedItems.length > 0) {
      return selectedItems.map((item) => item.path);
    }
  } catch {
    // Fall back to AppleScript below.
  }

  const script = `
    tell application "Finder"
      if (count of selection) is 0 then return ""
      set selectedItems to selection as alias list
      set outLines to {}
      repeat with selectedItem in selectedItems
        set end of outLines to POSIX path of selectedItem
      end repeat
      set AppleScript's text item delimiters to linefeed
      set outputText to outLines as text
      set AppleScript's text item delimiters to ""
      return outputText
    end tell
  `;

  try {
    const { stdout } = await runCommand("osascript", ["-e", script]);
    return stdout
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Could not read the Finder selection: ${error.message}`
        : "Could not read the Finder selection.",
    );
  }
}

async function pathExists(itemPath: string): Promise<boolean> {
  try {
    await access(itemPath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function extractZip(zipPath: string): Promise<string> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "install-fonts-"));
  try {
    await runCommand("ditto", ["-x", "-k", zipPath, tempDir]);
    return tempDir;
  } catch (error) {
    await rm(tempDir, { recursive: true, force: true });
    throw error;
  }
}

async function inspectZipArchive(zipPath: string) {
  const { stdout } = await runCommand("unzip", ["-l", zipPath]);
  const lines = stdout.split(/\r?\n/);
  let entryCount = 0;
  let totalBytes = 0;

  for (const line of lines) {
    const trimmed = line.trimEnd();
    if (!trimmed || trimmed.startsWith("Archive:") || trimmed.startsWith("Length") || trimmed.startsWith("--------")) {
      continue;
    }

    // Match file entry lines only; skip the footer totals line (e.g. "10  2 files").
    const match = trimmed.match(/^\s*(\d+)\s+\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2}\s+/);
    if (!match) {
      continue;
    }

    entryCount += 1;
    totalBytes += Number(match[1]);
  }

  if (entryCount > MAX_ZIP_ENTRIES) {
    throw new Error(`The zip file contains too many items (${entryCount}). Please use a smaller archive.`);
  }

  if (totalBytes > MAX_ZIP_UNCOMPRESSED_BYTES) {
    throw new Error("The zip file is too large to inspect safely. Please use a smaller archive.");
  }
}

function isHiddenName(name: string): boolean {
  return name.startsWith(".") || name === "__MACOSX";
}

function isFontFile(fileName: string): boolean {
  return FONT_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

function isZipFile(fileName: string): boolean {
  return ZIP_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

const FONT_STYLE_WORDS = new Set([
  "regular",
  "roman",
  "book",
  "bold",
  "italic",
  "oblique",
  "light",
  "thin",
  "hairline",
  "medium",
  "semibold",
  "demibold",
  "black",
  "heavy",
  "extrabold",
  "ultrabold",
  "condensed",
  "compressed",
  "extended",
  "narrow",
  "wide",
  "display",
  "caption",
  "text",
  "outline",
  "inline",
  "rounded",
  "slab",
  "poster",
]);

function splitCamelCase(value: string) {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function inferFontFamilyAndStyle(fileName: string) {
  const baseName = path.basename(fileName, path.extname(fileName));
  const normalized = splitCamelCase(baseName).replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  const words = normalized.split(" ").filter(Boolean);
  const styleWords: string[] = [];

  while (words.length > 0) {
    const candidate = words[words.length - 1];
    const lower = candidate.toLowerCase();
    if (FONT_STYLE_WORDS.has(lower) || /^\d+$/.test(lower)) {
      styleWords.unshift(candidate);
      words.pop();
      continue;
    }
    break;
  }

  const family = words.join(" ").trim() || normalized || baseName;
  const style = styleWords.join(" ").trim() || "Regular";

  return {
    family,
    style,
    label: `${family} · ${style}`,
  };
}

function formatCandidateLabel(candidate: FontCandidate) {
  const { label } = inferFontFamilyAndStyle(candidate.fileName);
  return `${label} (${candidate.relativePath})`;
}

function getFileTypeLabel(candidate: FontCandidate) {
  return path.extname(candidate.fileName).replace(".", "").toUpperCase();
}

function groupCandidatesByFileType(fontCandidates: FontCandidate[]) {
  const groups = new Map<string, FontCandidate[]>();

  for (const candidate of fontCandidates) {
    const fileType = getFileTypeLabel(candidate);
    const existing = groups.get(fileType) ?? [];
    existing.push(candidate);
    groups.set(fileType, existing);
  }

  return groups;
}

function buildFileTypeChoices(fontCandidates: FontCandidate[]) {
  const grouped = groupCandidatesByFileType(fontCandidates);
  return Array.from(grouped.entries())
    .map(([type, candidates]) => ({
      id: `type-${type}`,
      type,
      candidates,
    }))
    .sort((a, b) => a.type.localeCompare(b.type));
}

async function walkPath(
  currentPath: string,
  sourceRoot: string,
  relativeRoot: string,
  relativePrefix: string,
  tempDirs: string[],
  budget: WalkBudget,
): Promise<FontCandidate[]> {
  const results: FontCandidate[] = [];
  const currentStat = await lstat(currentPath);

  if (currentStat.isSymbolicLink()) {
    throw new Error(`Symlinked paths not supported: ${currentPath}`);
  }

  if (currentStat.isFile()) {
    if (isFontFile(currentPath)) {
      budget.fileCount += 1;
      budget.totalBytes += currentStat.size;
      if (budget.fileCount > MAX_FONT_FILES_PER_INSTALL) {
        throw new Error(
          `Too many font files found. Please choose a smaller set (limit ${MAX_FONT_FILES_PER_INSTALL}).`,
        );
      }
      if (budget.totalBytes > MAX_TOTAL_FONT_BYTES) {
        throw new Error("The selected fonts are too large to install safely.");
      }

      const relativePathFromRoot = path.relative(relativeRoot, currentPath) || path.basename(currentPath);
      results.push({
        sourcePath: currentPath,
        sourceRoot,
        fileName: path.basename(currentPath),
        relativePath: relativePrefix ? path.join(relativePrefix, relativePathFromRoot) : relativePathFromRoot,
      });
    } else if (isZipFile(currentPath)) {
      await inspectZipArchive(currentPath);
      const extractedDir = await extractZip(currentPath);
      tempDirs.push(extractedDir);
      results.push(...(await walkPath(extractedDir, sourceRoot, extractedDir, "", tempDirs, budget)));
    }

    return results;
  }

  if (!currentStat.isDirectory()) {
    return results;
  }

  const entries = await readdir(currentPath, { withFileTypes: true });
  for (const entry of entries) {
    if (isHiddenName(entry.name)) {
      continue;
    }

    const entryPath = path.join(currentPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await walkPath(entryPath, sourceRoot, relativeRoot, relativePrefix, tempDirs, budget)));
      continue;
    }

    if (entry.isSymbolicLink()) {
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (isFontFile(entry.name)) {
      const entryStat = await stat(entryPath);
      budget.fileCount += 1;
      budget.totalBytes += entryStat.size;
      if (budget.fileCount > MAX_FONT_FILES_PER_INSTALL) {
        throw new Error(
          `Too many font files found. Please choose a smaller set (limit ${MAX_FONT_FILES_PER_INSTALL}).`,
        );
      }
      if (budget.totalBytes > MAX_TOTAL_FONT_BYTES) {
        throw new Error("The selected fonts are too large to install safely.");
      }

      const relativePathFromRoot = path.relative(relativeRoot, entryPath) || entry.name;
      results.push({
        sourcePath: entryPath,
        sourceRoot,
        fileName: entry.name,
        relativePath: relativePrefix ? path.join(relativePrefix, relativePathFromRoot) : relativePathFromRoot,
      });
      continue;
    }

    if (isZipFile(entry.name)) {
      await inspectZipArchive(entryPath);
      const extractedDir = await extractZip(entryPath);
      tempDirs.push(extractedDir);
      const zipRelativePath = path.relative(relativeRoot, entryPath);
      const zipPrefix = relativePrefix ? path.join(relativePrefix, zipRelativePath) : zipRelativePath;
      results.push(...(await walkPath(extractedDir, sourceRoot, extractedDir, zipPrefix, tempDirs, budget)));
    }
  }

  return results;
}

async function prepareInstall(sourcePaths: SourcePath[]): Promise<PreparedInstall> {
  const tempDirs: string[] = [];
  const fontCandidates: FontCandidate[] = [];
  const budget: WalkBudget = {
    fileCount: 0,
    totalBytes: 0,
  };

  for (const source of sourcePaths) {
    const sourceStat = await stat(source.path);
    if (sourceStat.isDirectory()) {
      fontCandidates.push(...(await walkPath(source.path, source.path, source.path, "", tempDirs, budget)));
      continue;
    }

    if (!sourceStat.isFile()) {
      continue;
    }

    if (isFontFile(source.path)) {
      budget.fileCount += 1;
      budget.totalBytes += sourceStat.size;
      if (budget.fileCount > MAX_FONT_FILES_PER_INSTALL) {
        throw new Error(
          `Too many font files found. Please choose a smaller set (limit ${MAX_FONT_FILES_PER_INSTALL}).`,
        );
      }
      if (budget.totalBytes > MAX_TOTAL_FONT_BYTES) {
        throw new Error("The selected fonts are too large to install safely.");
      }

      fontCandidates.push({
        sourcePath: source.path,
        sourceRoot: source.path,
        fileName: path.basename(source.path),
        relativePath: path.basename(source.path),
      });
      continue;
    }

    if (isZipFile(source.path)) {
      await inspectZipArchive(source.path);
      const extractedDir = await extractZip(source.path);
      tempDirs.push(extractedDir);
      fontCandidates.push(...(await walkPath(extractedDir, source.path, extractedDir, "", tempDirs, budget)));
      continue;
    }

    throw new Error(`Unsupported file type: ${path.basename(source.path)}`);
  }

  return {
    sourcePaths,
    fontCandidates,
    duplicates: [],
    tempDirs,
  };
}

async function uniqueDestinationPath(directory: string, fileName: string, occupiedPaths: Set<string>): Promise<string> {
  const parsed = path.parse(fileName);
  const baseAttempt = path.join(directory, fileName);
  if (!(await pathExists(baseAttempt)) && !occupiedPaths.has(baseAttempt)) {
    return baseAttempt;
  }

  for (let attempt = 2; attempt <= MAX_FILENAME_ATTEMPTS; attempt += 1) {
    const candidate = path.join(directory, `${parsed.name} ${attempt}${parsed.ext}`);
    if (!(await pathExists(candidate)) && !occupiedPaths.has(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Could not find a unique filename for ${fileName}`);
}

async function installCandidates(
  prepared: PreparedInstall,
  selectedCandidates: FontCandidate[],
  duplicateMode: DuplicateHandling,
  preferences: Preferences.InstallFonts,
): Promise<InstallResult> {
  await mkdir(FONT_LIBRARY_DIR, { recursive: true });

  const installed: InstallResult["installed"] = [];
  const skipped: InstallResult["skipped"] = [];
  const failed: InstallResult["failed"] = [];
  const trashed: string[] = [];
  const warnings: string[] = [];
  const occupiedPaths = new Set<string>();
  const seenNames = new Set<string>();
  const selectedBySource = groupCandidatesBySource(selectedCandidates);
  const allBySource = groupCandidatesBySource(prepared.fontCandidates);

  for (const candidate of selectedCandidates) {
    const destinationBaseName = path.basename(candidate.fileName);
    const normalizedBaseName = destinationBaseName.toLowerCase();
    const destinationPath = path.join(FONT_LIBRARY_DIR, destinationBaseName);
    const sameFile = path.resolve(candidate.sourcePath) === path.resolve(destinationPath);
    const alreadyPresent = (await pathExists(destinationPath)) || occupiedPaths.has(destinationPath);
    const duplicateInBatch = seenNames.has(normalizedBaseName);

    seenNames.add(normalizedBaseName);

    if (sameFile) {
      skipped.push({
        sourcePath: candidate.sourcePath,
        reason: "This font is already in your Fonts folder.",
      });
      continue;
    }

    if (duplicateMode === "skip" && (alreadyPresent || duplicateInBatch)) {
      skipped.push({
        sourcePath: candidate.sourcePath,
        reason: `A font named ${destinationBaseName} already exists.`,
      });
      continue;
    }

    let targetPath = destinationPath;
    if (duplicateMode === "keep-both" && (alreadyPresent || duplicateInBatch)) {
      targetPath = await uniqueDestinationPath(FONT_LIBRARY_DIR, destinationBaseName, occupiedPaths);
    }

    try {
      await copyFile(candidate.sourcePath, targetPath);
      occupiedPaths.add(targetPath);
      installed.push({
        sourcePath: candidate.sourcePath,
        destinationPath: targetPath,
      });
    } catch (error) {
      failed.push({
        sourcePath: candidate.sourcePath,
        reason: error instanceof Error ? error.message : "Unknown install error",
      });
    }
  }

  if (failed.length > 0) {
    warnings.push("Source files were not trashed because at least one install failed.");
  }

  if (preferences.trashSourceAfterInstall && installed.length > 0 && failed.length === 0) {
    try {
      // Only trash a source when every font candidate from it was selected.
      // Otherwise a zip/folder with mixed types (or a manual deselect) would
      // permanently delete the fonts the user chose not to install.
      const trashablePaths = prepared.sourcePaths
        .map((source) => source.path)
        .filter((sourcePath) => {
          const allCandidates = allBySource.get(sourcePath) ?? [];
          const selectedSourceCandidates = selectedBySource.get(sourcePath) ?? [];
          return allCandidates.length > 0 && allCandidates.length === selectedSourceCandidates.length;
        });

      const existingPaths = (
        await Promise.all(trashablePaths.map(async (itemPath) => [itemPath, await pathExists(itemPath)] as const))
      )
        .filter(([, exists]) => exists)
        .map(([itemPath]) => itemPath);

      if (existingPaths.length > 0) {
        await trashItemsWithFallback(existingPaths);
        trashed.push(...existingPaths);
      }
    } catch (error) {
      warnings.push(
        error instanceof Error
          ? `Could not trash some source files: ${error.message}`
          : "Could not trash some source files.",
      );
    }
  }

  return {
    installed,
    skipped,
    failed,
    trashed,
    warnings,
  };
}

async function cleanupTempDirs(tempDirs: string[]) {
  await Promise.all(tempDirs.map((tempDir) => rm(tempDir, { recursive: true, force: true })));
}

function escapeAppleScriptString(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

async function trashItemsWithFallback(paths: string[]) {
  if (paths.length === 0) {
    return;
  }

  try {
    await trash(paths);
    return;
  } catch {
    // Fall back to Finder so we still clean up if Raycast's trash helper is unavailable.
  }

  const script = `
    tell application "Finder"
      set fileList to {${paths.map((item) => `POSIX file "${escapeAppleScriptString(item)}"`).join(", ")}}
      delete fileList
    end tell
  `;

  await runCommand("osascript", ["-e", script]);
}

function markdownEscape(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\*/g, "\\*").replace(/_/g, "\\_");
}

function renderPaths(paths: string[]) {
  return paths.map((item) => `- \`${markdownEscape(item)}\``).join("\n");
}

function renderCandidates(candidates: FontCandidate[], limit = 25) {
  const slice = candidates.slice(0, limit);
  const lines = slice.map((candidate) => `- \`${markdownEscape(candidate.relativePath)}\``);
  if (candidates.length > limit) {
    lines.push(`- ...and ${candidates.length - limit} more`);
  }
  return lines.join("\n");
}

function renderResult(result: InstallResult) {
  const sections = [
    `# Install Fonts`,
    "",
    `## Done`,
    `- Installed: ${result.installed.length}`,
    `- Skipped: ${result.skipped.length}`,
    `- Failed: ${result.failed.length}`,
    `- Trashed: ${result.trashed.length}`,
  ];

  if (result.installed.length > 0) {
    sections.push("", "## Installed Fonts", renderPaths(result.installed.map((item) => item.destinationPath)));
  }

  if (result.skipped.length > 0) {
    sections.push(
      "",
      "## Skipped",
      result.skipped
        .map((item) => `- \`${markdownEscape(item.sourcePath)}\` - ${markdownEscape(item.reason)}`)
        .join("\n"),
    );
  }

  if (result.failed.length > 0) {
    sections.push(
      "",
      "## Failed",
      result.failed
        .map((item) => `- \`${markdownEscape(item.sourcePath)}\` - ${markdownEscape(item.reason)}`)
        .join("\n"),
    );
  }

  if (result.warnings.length > 0) {
    sections.push("", "## Warnings", result.warnings.map((item) => `- ${markdownEscape(item)}`).join("\n"));
  }

  return sections.join("\n");
}

function renderPrompt(prepared: PreparedInstall, candidates: FontCandidate[] = prepared.fontCandidates) {
  return [
    "# Duplicate fonts detected",
    "",
    "Install Fonts found files that appear to conflict with existing fonts or another file in the current batch.",
    "",
    "## Selected Sources",
    renderPaths(prepared.sourcePaths.map((item) => item.path)),
    "",
    "## Fonts Found",
    renderCandidates(candidates),
    "",
    "Use one of the actions below to choose how duplicates should be handled.",
  ].join("\n");
}

function renderError(title: string, description: string) {
  return [`# ${title}`, "", description].join("\n");
}

function renderLoading(message: string, sources: string[] = []) {
  const sections = ["# Install Fonts", "", message];
  if (sources.length > 0) {
    sections.push("", "## Selected Items", renderPaths(sources));
  }
  return sections.join("\n");
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences.InstallFonts>();
  const [phase, setPhase] = useState<Phase>("loading");
  const [prepared, setPrepared] = useState<PreparedInstall | null>(null);
  const [result, setResult] = useState<InstallResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [duplicateMode, setDuplicateMode] = useState<DuplicateHandling | null>(null);
  const [selectedCandidates, setSelectedCandidates] = useState<FontCandidate[] | null>(null);
  const tempDirsRef = useRef<string[]>([]);
  const installStartedRef = useRef(false);

  async function continueWithSelection(nextSelected: FontCandidate[]) {
    setSelectedCandidates(nextSelected);
    if (preferences.duplicateHandling === "ask") {
      const nextDuplicates = await detectDuplicates(nextSelected);
      if (nextDuplicates.length > 0) {
        setPhase("needsChoice");
        return;
      }
    }

    setPhase("installing");
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const selectedPaths = await getFinderSelection();
        if (selectedPaths.length === 0) {
          throw new Error(
            "Select one or more font files, a font folder, or a zip file in Finder, then run Install Fonts again.",
          );
        }

        const sourcePaths: SourcePath[] = await Promise.all(
          selectedPaths.map(async (selectedPath) => {
            const sourceStat = await lstat(selectedPath);

            if (sourceStat.isSymbolicLink()) {
              throw new Error(`Symlinked Finder items are not supported: ${selectedPath}`);
            }

            if (sourceStat.isDirectory()) {
              return { path: selectedPath, kind: "folder" as const };
            }

            if (sourceStat.isFile()) {
              if (isZipFile(selectedPath)) {
                return { path: selectedPath, kind: "zip" as const };
              }
              return { path: selectedPath, kind: "file" as const };
            }

            throw new Error(`Unsupported Finder item: ${selectedPath}`);
          }),
        );

        const preparedInstall = await prepareInstall(sourcePaths);
        tempDirsRef.current = preparedInstall.tempDirs;

        if (preparedInstall.fontCandidates.length === 0) {
          throw new Error("No supported font files were found in the selected item(s).");
        }

        if (cancelled) {
          await cleanupTempDirs(preparedInstall.tempDirs);
          return;
        }

        setPrepared(preparedInstall);

        if (
          preferences.fontSelectionMode === "ask-when-variants-found" &&
          needsVersionSelection(preparedInstall.fontCandidates)
        ) {
          setPhase("chooseType");
          return;
        }

        await continueWithSelection(preparedInstall.fontCandidates);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "Something went wrong while preparing the install.");
        setPhase("error");
      }
    }

    void load();

    return () => {
      cancelled = true;
      void cleanupTempDirs(tempDirsRef.current);
    };
  }, [preferences.duplicateHandling, preferences.fontSelectionMode]);

  useEffect(() => {
    if (phase !== "installing" || !prepared || installStartedRef.current) {
      return;
    }

    const activePrepared = prepared;
    const activeCandidates = selectedCandidates ?? activePrepared.fontCandidates;
    installStartedRef.current = true;

    async function install() {
      try {
        await showToast({
          style: Toast.Style.Animated,
          title: "Installing fonts",
          message: `Processing ${activeCandidates.length} file(s)...`,
        });

        const mode =
          duplicateMode ?? (preferences.duplicateHandling === "ask" ? "skip" : preferences.duplicateHandling);
        const installResult = await installCandidates(activePrepared, activeCandidates, mode, preferences);

        setResult(installResult);
        setPhase("done");
        await cleanupTempDirs(activePrepared.tempDirs);

        if (installResult.failed.length === 0) {
          await showToast({
            style: Toast.Style.Success,
            title: "Fonts installed",
            message: `${installResult.installed.length} installed, ${installResult.skipped.length} skipped`,
          });
          await closeMainWindow({
            clearRootSearch: true,
            popToRootType: PopToRootType.Immediate,
          });

          if (preferences.showFinderAfterInstall) {
            await showInFinder(FONT_LIBRARY_DIR);
          }
        } else {
          await showToast({
            style: Toast.Style.Failure,
            title: "Font install finished with issues",
            message: `${installResult.installed.length} installed, ${installResult.failed.length} failed`,
          });
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Something went wrong while installing fonts.");
        setPhase("error");
        await cleanupTempDirs(activePrepared.tempDirs);
      }
    }

    void install();
  }, [duplicateMode, phase, prepared, preferences, selectedCandidates]);

  useEffect(() => {
    if (phase === "loading") {
      void showToast({
        style: Toast.Style.Animated,
        title: "Install Fonts",
        message: "Reading your Finder selection...",
      });
    }
  }, [phase]);

  const markdown = useMemo(() => {
    if (phase === "error") {
      return renderError("Install Fonts", errorMessage ?? "An unknown error occurred.");
    }

    if (phase === "done" && result) {
      return renderResult(result);
    }

    if (phase === "chooseType" && prepared) {
      const typeChoices = buildFileTypeChoices(prepared.fontCandidates);
      return [
        "# Install Fonts",
        "",
        "Choose a quick install target or open the font picker.",
        "",
        "## Quick Install",
        typeChoices.map((choice) => `- Install all ${choice.type}`).join("\n"),
        "",
        "## More Control",
        "- Select Fonts to Install",
      ].join("\n");
    }

    if (phase === "needsChoice" && prepared) {
      return renderPrompt(prepared, selectedCandidates ?? prepared.fontCandidates);
    }

    if (phase === "chooseFonts" && prepared) {
      return [
        "# Install Fonts",
        "",
        "Choose which font versions you want to install.",
        "",
        "## Detected Versions",
        renderCandidates(prepared.fontCandidates),
      ].join("\n");
    }

    if (phase === "installing" && prepared) {
      return renderLoading(
        "Installing your fonts now.",
        prepared.sourcePaths.map((item) => item.path),
      );
    }

    if (prepared) {
      return renderLoading(
        "Preparing your selected items.",
        prepared.sourcePaths.map((item) => item.path),
      );
    }

    if (errorMessage) {
      return renderError("Install Fonts", errorMessage);
    }

    return renderLoading("Waiting for Finder selection.");
  }, [errorMessage, phase, prepared, result]);

  if (phase === "chooseType" && prepared) {
    const typeChoices = buildFileTypeChoices(prepared.fontCandidates);

    return (
      <List searchBarPlaceholder="Choose how to install…" selectedItemId={typeChoices[0]?.id}>
        <List.Section title="Quick Install">
          {typeChoices.map((choice) => (
            <List.Item
              key={choice.id}
              id={choice.id}
              title={choice.type}
              subtitle={`Install all ${choice.candidates.length} font file${choice.candidates.length === 1 ? "" : "s"}`}
              icon={Icon.ArrowRightCircleFilled}
              keywords={[choice.type, "install", "all", "quick"]}
              accessories={[{ text: `${choice.candidates.length}` }, { text: "Enter", icon: Icon.ArrowRight }]}
              actions={
                <ActionPanel>
                  <Action
                    title={`Install All ${choice.type}`}
                    icon={Icon.ArrowRight}
                    onAction={() => {
                      void continueWithSelection(choice.candidates);
                    }}
                  />
                  <Action title="Open Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
        <List.Section title="More Control">
          <List.Item
            id="custom-selection"
            title="Select Fonts to Install"
            subtitle="Pick individual font files"
            icon={Icon.CheckCircle}
            keywords={["select", "custom", "fonts", "picker", "choose"]}
            accessories={[{ text: "Space" }, { text: "Enter", icon: Icon.ArrowRight }]}
            actions={
              <ActionPanel>
                <Action
                  title="Select Fonts to Install"
                  icon={Icon.CheckCircle}
                  onAction={() => {
                    setPhase("chooseFonts");
                  }}
                />
                <Action title="Open Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
              </ActionPanel>
            }
          />
        </List.Section>
      </List>
    );
  }

  if (phase === "chooseFonts" && prepared) {
    const chooserCandidates = prepared.fontCandidates;
    const chooserIds = chooserCandidates.map((_, index) => `candidate-${index}`);
    return (
      <Form
        navigationTitle="Select Fonts"
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Install Selected Fonts"
              onSubmit={async (values) => {
                const nextSelected = chooserCandidates.filter((_, index) => values[`candidate-${index}`] === true);
                if (nextSelected.length === 0) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "No fonts selected",
                    message: "Select at least one font version before installing.",
                  });
                  return;
                }

                await continueWithSelection(nextSelected);
              }}
            />
            <Action title="Open Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
          </ActionPanel>
        }
      >
        {chooserCandidates.map((candidate, index) => (
          <Form.Checkbox
            key={candidate.sourcePath}
            id={chooserIds[index]}
            label={formatCandidateLabel(candidate)}
            defaultValue
          />
        ))}
      </Form>
    );
  }

  if (phase === "needsChoice" && prepared) {
    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action
              title="Skip Duplicates"
              icon={Icon.XMarkCircle}
              onAction={() => {
                setDuplicateMode("skip");
                setPhase("installing");
              }}
            />
            <Action
              title="Overwrite Duplicates"
              icon={Icon.ArrowClockwise}
              onAction={() => {
                setDuplicateMode("overwrite");
                setPhase("installing");
              }}
            />
            <Action
              title="Keep Both"
              icon={Icon.PlusCircle}
              onAction={() => {
                setDuplicateMode("keep-both");
                setPhase("installing");
              }}
            />
            <Action title="Open Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  if (phase === "error") {
    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action title="Open Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  if (phase === "done" && result) {
    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action title="Open Fonts Folder" icon={Icon.Folder} onAction={() => showInFinder(FONT_LIBRARY_DIR)} />
            <Action title="Open Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  return <Detail markdown={markdown} />;
}

async function detectDuplicates(fontCandidates: FontCandidate[]) {
  const seenNames = new Set<string>();
  const duplicates: FontCandidate[] = [];
  const existingNames = new Set<string>();

  try {
    const existingEntries = await readdir(FONT_LIBRARY_DIR, { withFileTypes: true });
    for (const entry of existingEntries) {
      if (entry.isFile()) {
        existingNames.add(entry.name.toLowerCase());
      }
    }
  } catch {
    // Ignore missing Fonts folder on first run.
  }

  for (const candidate of fontCandidates) {
    const normalizedName = candidate.fileName.toLowerCase();
    if (seenNames.has(normalizedName) || existingNames.has(normalizedName)) {
      duplicates.push(candidate);
      continue;
    }

    seenNames.add(normalizedName);
  }

  return duplicates;
}

function needsVersionSelection(fontCandidates: FontCandidate[]) {
  return groupCandidatesByFileType(fontCandidates).size > 1;
}

function groupCandidatesBySource(fontCandidates: FontCandidate[]) {
  const groups = new Map<string, FontCandidate[]>();

  for (const candidate of fontCandidates) {
    const existing = groups.get(candidate.sourceRoot) ?? [];
    existing.push(candidate);
    groups.set(candidate.sourceRoot, existing);
  }

  return groups;
}
