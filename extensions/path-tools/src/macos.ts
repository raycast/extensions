import { execFile } from "node:child_process";
import { readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const maxSearchResults = 100;
const maxScannedEntries = 30_000;
const excludedSearchDirectories = new Set([
  ".git",
  ".Trash",
  "Library",
  "node_modules",
]);

const finderTargetScript = `
on run argv
  tell application "Finder"
    try
      set selectedItems to selection
      if (count of selectedItems) > 0 then
        return POSIX path of (item 1 of selectedItems as alias)
      end if
      return POSIX path of (folder of the front window as alias)
    on error
      error "Finder has no selection or open window."
    end try
  end tell
end run`;

const finderFolderScript = `
on run argv
  tell application "Finder"
    try
      return POSIX path of (folder of the front window as alias)
    on error
      error "Open a Finder window first."
    end try
  end tell
end run`;

async function runAppleScript(
  script: string,
  args: string[] = [],
): Promise<string> {
  try {
    const { stdout } = await execFileAsync("/usr/bin/osascript", [
      "-e",
      script,
      ...args,
    ]);
    return stdout.trim();
  } catch (error) {
    const stderr =
      typeof error === "object" && error !== null && "stderr" in error
        ? String(error.stderr).trim()
        : "";
    throw new Error(
      stderr || (error instanceof Error ? error.message : String(error)),
    );
  }
}

export async function getFinderTarget(): Promise<string> {
  return runAppleScript(finderTargetScript);
}

export async function getFinderFolder(): Promise<string> {
  return runAppleScript(finderFolderScript);
}

export async function openInIterm(path: string): Promise<void> {
  // Passing the path as an AppleScript argument keeps spaces and shell metacharacters literal.
  await runAppleScript(
    `
on run argv
  set targetPath to item 1 of argv
  tell application "iTerm"
    activate
    if (count of windows) is 0 then
      create window with default profile
    else
      tell current window to create tab with default profile
    end if
    tell current session of current window to write text "cd " & quoted form of targetPath
  end tell
end run`,
    [path],
  );
}

export async function findPaths(query: string): Promise<string[]> {
  const escapedQuery = query.replace(/[\\*"]/g, "\\$&");
  const spotlightQuery = `kMDItemFSName == "*${escapedQuery}*"cdw`;
  const { stdout } = await execFileAsync("/usr/bin/mdfind", [spotlightQuery]);
  const spotlightCandidates = stdout
    .split("\n")
    .map((path) => path.trim())
    .filter(Boolean);
  const spotlightPaths = await filterExistingPaths(spotlightCandidates);

  if (spotlightPaths.length >= maxSearchResults) {
    return spotlightPaths.slice(0, maxSearchResults);
  }

  const fallbackPaths = await searchHomeDirectory(query);
  const candidatePaths = [...new Set([...spotlightPaths, ...fallbackPaths])];
  return (await filterExistingPaths(candidatePaths)).slice(0, maxSearchResults);
}

async function filterExistingPaths(paths: string[]): Promise<string[]> {
  const existingPaths = await Promise.all(
    paths.map(async (path) => {
      try {
        await stat(path);
        return path;
      } catch {
        return undefined;
      }
    }),
  );

  return existingPaths.filter((path): path is string => path !== undefined);
}

async function searchHomeDirectory(query: string): Promise<string[]> {
  const matchingPaths: string[] = [];
  const pendingDirectories = [homedir()];
  const normalizedQuery = query.toLocaleLowerCase();
  let scannedEntries = 0;

  while (
    pendingDirectories.length > 0 &&
    scannedEntries < maxScannedEntries &&
    matchingPaths.length < maxSearchResults
  ) {
    const directory = pendingDirectories.shift();
    if (!directory) break;

    try {
      const entries = await readdir(directory, { withFileTypes: true });
      for (const entry of entries) {
        scannedEntries += 1;
        const path = join(directory, entry.name);

        if (entry.name.toLocaleLowerCase().includes(normalizedQuery)) {
          matchingPaths.push(path);
          if (matchingPaths.length === maxSearchResults) break;
        }

        if (
          entry.isDirectory() &&
          !entry.name.startsWith(".") &&
          !excludedSearchDirectories.has(entry.name)
        ) {
          pendingDirectories.push(path);
        }

        if (scannedEntries === maxScannedEntries) break;
      }
    } catch {
      // Skip directories that are unavailable or protected by macOS privacy controls.
    }
  }

  return matchingPaths;
}

export async function getItermTarget(path: string): Promise<string> {
  // iTerm can enter directories only; opening a file uses its containing directory.
  return (await stat(path)).isDirectory() ? path : dirname(path);
}

export async function openItermDirectoryInFinder(): Promise<void> {
  const directoryUrl = await runAppleScript(`
tell application id "com.googlecode.iterm2"
  activate
  if (count of windows) is 0 then error "iTerm has no open window."
  set activeSession to «class Wcsn» of «class Crwn»
  -- iTerm exposes this command as "variable", an AppleScript reserved word.
  set directoryUrl to «event Itrmvarb» activeSession given «class Namd»:"path"
  if directoryUrl is missing value or directoryUrl is "" then
    error "iTerm could not determine the current directory. Enable Shell Integration and try again."
  end if
  return directoryUrl
end tell`);

  const directory = fileUrlToPath(directoryUrl);
  await execFileAsync("/usr/bin/open", ["-a", "Finder", directory]);
}

function fileUrlToPath(directoryUrl: string): string {
  try {
    const url = new URL(directoryUrl);
    if (
      url.protocol === "file:" &&
      (url.host === "" || url.host === "localhost")
    ) {
      return decodeURIComponent(url.pathname);
    }
  } catch {
    // Some iTerm configurations expose the path directly rather than as a file URL.
  }

  if (directoryUrl.startsWith("/")) return directoryUrl;
  throw new Error("iTerm returned an unsupported current-directory URL.");
}

export async function openInVisualStudioCode(path: string): Promise<void> {
  const expandedPath =
    path === "~"
      ? homedir()
      : path.startsWith("~/")
        ? join(homedir(), path.slice(2))
        : path;
  await execFileAsync("/usr/bin/open", [
    "-a",
    "Visual Studio Code",
    expandedPath,
  ]);
}
