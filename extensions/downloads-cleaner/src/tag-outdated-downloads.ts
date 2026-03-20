import { getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";

const execFileAsync = promisify(execFile);

type FinderTagColor = "red" | "orange" | "yellow" | "green" | "blue" | "purple" | "gray";

interface CommandPreferences {
  downloadFolderPath?: string;
  timeThresholdDays?: string;
  finderTagColor?: FinderTagColor;
}

const FINDER_LABEL_INDEX_BY_COLOR: Record<FinderTagColor, number> = {
  orange: 1,
  red: 2,
  yellow: 3,
  blue: 4,
  purple: 5,
  green: 6,
  gray: 7,
};

function expandHomePath(inputPath: string) {
  if (inputPath === "~") {
    return homedir();
  }

  if (inputPath.startsWith("~/")) {
    return join(homedir(), inputPath.slice(2));
  }

  return inputPath;
}

function parseThresholdDays(rawValue?: string) {
  const parsed = Number(rawValue ?? "2");
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 2;
  }

  return parsed;
}

function toPercent(current: number, total: number) {
  if (total <= 0) {
    return 100;
  }

  return Math.round((current / total) * 100);
}

function escapeAppleScriptString(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

async function setFinderTag(filePath: string, labelIndex: number) {
  const escapedPath = escapeAppleScriptString(filePath);
  const script = `tell application "Finder" to set label index of (POSIX file "${escapedPath}" as alias) to ${labelIndex}`;
  await execFileAsync("osascript", ["-e", script]);
}

export default async function main() {
  const preferences = getPreferenceValues<CommandPreferences>();
  const thresholdDays = parseThresholdDays(preferences.timeThresholdDays);
  const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;
  const tagColor: FinderTagColor = preferences.finderTagColor ?? "red";
  const labelIndex = FINDER_LABEL_INDEX_BY_COLOR[tagColor];
  const downloadsPath = expandHomePath(preferences.downloadFolderPath?.trim() || "~/Downloads");

  const progressToast = await showToast({
    style: Toast.Style.Animated,
    title: "Scanning folder",
    message: "0%",
  });

  const now = Date.now();
  const threshold = now - thresholdMs;

  const entries = await readdir(downloadsPath, { withFileTypes: true });
  const filesToTag: string[] = [];
  let scanned = 0;

  for (const entry of entries) {
    scanned += 1;
    progressToast.title = "Scanning folder";
    progressToast.message = `${toPercent(scanned, entries.length)}% (${scanned}/${entries.length})`;

    if (!entry.isFile()) {
      continue;
    }

    const fullPath = join(downloadsPath, entry.name);

    try {
      const fileStat = await stat(fullPath);
      if (fileStat.atimeMs < threshold) {
        filesToTag.push(fullPath);
      }
    } catch {
      // Ignore stat errors and continue with other files.
    }
  }

  if (filesToTag.length === 0) {
    progressToast.style = Toast.Style.Success;
    progressToast.title = "Scan complete";
    progressToast.message = `No files older than ${thresholdDays} day(s).`;
    await showHUD(`No files older than ${thresholdDays} day(s).`);
    return;
  }

  const failedFiles: string[] = [];
  let tagged = 0;

  for (const filePath of filesToTag) {
    tagged += 1;
    progressToast.title = "Tagging outdated files";
    progressToast.message = `${toPercent(tagged, filesToTag.length)}% (${tagged}/${filesToTag.length})`;

    try {
      await setFinderTag(filePath, labelIndex);
    } catch {
      failedFiles.push(filePath);
    }
  }

  const succeeded = filesToTag.length - failedFiles.length;

  if (failedFiles.length > 0) {
    const sample = failedFiles
      .slice(0, 3)
      .map((path) => path.split("/").pop() ?? path)
      .join(", ");
    progressToast.style = Toast.Style.Failure;
    progressToast.title = `Tagged ${succeeded}/${filesToTag.length} files`;
    progressToast.message = sample ? `Failed: ${sample}${failedFiles.length > 3 ? ", ..." : ""}` : "Some files failed";
    await showToast({
      style: Toast.Style.Failure,
      title: `Tagged ${succeeded}/${filesToTag.length} files`,
      message: sample ? `Failed: ${sample}${failedFiles.length > 3 ? ", ..." : ""}` : "Some files failed",
    });
    return;
  }

  progressToast.style = Toast.Style.Success;
  progressToast.title = `Tagged ${succeeded} files with ${tagColor} label`;
  progressToast.message = "Completed";
  await showHUD(`Tagged ${succeeded} files with ${tagColor} label`);
}
