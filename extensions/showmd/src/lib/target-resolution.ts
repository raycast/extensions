// Zero @raycast/api imports here on purpose, same seam as showmd.ts: this
// module opens a native file or folder picker and validates the pick holds
// at least one markdown file. Raycast-only concerns (Toast) live in
// raycast-glue.ts.

import { execFile as nodeExecFile } from "node:child_process";
import { promisify } from "node:util";
import { promises as fsp } from "node:fs";
import * as path from "node:path";
import { isDarwin, isWindows } from "./showmd.ts";

export type ExecFileFn = (
  command: string,
  args: string[],
) => Promise<{ stdout: string }>;
export type StatFn = (
  targetPath: string,
) => Promise<{ isFile: boolean; isDirectory: boolean } | null>;
export type ReadDirFn = (
  dirPath: string,
) => Promise<{ name: string; isDirectory: boolean }[]>;

export interface Deps {
  platform?: NodeJS.Platform;
  stat?: StatFn;
  readDir?: ReadDirFn;
  execFileImpl?: ExecFileFn;
}

interface ResolvedDeps {
  platform: NodeJS.Platform;
  stat: StatFn;
  readDir: ReadDirFn;
  execFileImpl: ExecFileFn;
}

const execFileP = promisify(nodeExecFile);

async function defaultStat(
  targetPath: string,
): Promise<{ isFile: boolean; isDirectory: boolean } | null> {
  try {
    const s = await fsp.stat(targetPath);
    return { isFile: s.isFile(), isDirectory: s.isDirectory() };
  } catch {
    return null;
  }
}

async function defaultReadDir(
  dirPath: string,
): Promise<{ name: string; isDirectory: boolean }[]> {
  const entries = await fsp.readdir(dirPath, { withFileTypes: true });
  return entries.map((e) => ({ name: e.name, isDirectory: e.isDirectory() }));
}

async function defaultExecFile(
  command: string,
  args: string[],
): Promise<{ stdout: string }> {
  const { stdout } = await execFileP(command, args, { windowsHide: true });
  return { stdout };
}

function resolveDeps(deps: Deps = {}): ResolvedDeps {
  return {
    platform: deps.platform ?? process.platform,
    stat: deps.stat ?? defaultStat,
    readDir: deps.readDir ?? defaultReadDir,
    execFileImpl: deps.execFileImpl ?? defaultExecFile,
  };
}

const MARKDOWN_RE = /\.(md|markdown)$/i;

export type ValidationResult =
  { ok: true; path: string } | { ok: false; error: string };

// Breadth-first, depth-capped scan for at least one markdown file: projects
// often keep their .md files in subdirectories, not the root, so a shallow
// "root only" check would false-negative on most real repos. Exits the
// moment a hit is found rather than walking the whole tree.
async function containsMarkdown(
  rootDir: string,
  resolved: ResolvedDeps,
  depthCap: number,
): Promise<boolean> {
  const queue: { dir: string; depth: number }[] = [{ dir: rootDir, depth: 0 }];
  while (queue.length > 0) {
    const { dir, depth } = queue.shift()!;
    let entries: { name: string; isDirectory: boolean }[];
    try {
      entries = await resolved.readDir(dir);
    } catch {
      continue;
    }
    if (entries.some((e) => !e.isDirectory && MARKDOWN_RE.test(e.name)))
      return true;
    if (depth < depthCap) {
      for (const entry of entries) {
        if (entry.isDirectory) {
          queue.push({ dir: path.join(dir, entry.name), depth: depth + 1 });
        }
      }
    }
  }
  return false;
}

const FOLDER_SCAN_DEPTH_CAP = 3;

export type TargetKind = "folder" | "file";

export async function validatePath(
  kind: TargetKind,
  targetPath: string,
  deps: Deps = {},
): Promise<ValidationResult> {
  const resolved = resolveDeps(deps);
  const stat = await resolved.stat(targetPath);
  if (!stat) return { ok: false, error: `${targetPath} does not exist` };
  if (kind === "folder") {
    if (!stat.isDirectory)
      return { ok: false, error: `${targetPath} is not a folder` };
    const found = await containsMarkdown(
      targetPath,
      resolved,
      FOLDER_SCAN_DEPTH_CAP,
    );
    if (!found)
      return { ok: false, error: `No markdown files found in ${targetPath}` };
    return { ok: true, path: targetPath };
  }
  if (!stat.isFile) return { ok: false, error: `${targetPath} is not a file` };
  if (!MARKDOWN_RE.test(targetPath))
    return { ok: false, error: `${targetPath} is not a markdown file` };
  return { ok: true, path: targetPath };
}

const CANCELED = "__CANCELED__";

const MAC_CHOOSE_FOLDER_SCRIPT = `try
	set thePath to POSIX path of (choose folder with prompt "Open Folder")
	return thePath
on error
	return "${CANCELED}"
end try`;

const MAC_CHOOSE_FILE_SCRIPT = `try
	set thePath to POSIX path of (choose file with prompt "Open File" of type {"md", "markdown"})
	return thePath
on error
	return "${CANCELED}"
end try`;

// Same one-liner shape as server/folder-picker.js's win32 branch: a bare
// System.Windows.Forms dialog, no persistent helper app needed here since
// this only ever pops once per command invocation.
const WIN_CHOOSE_FOLDER_SCRIPT = `Add-Type -AssemblyName System.Windows.Forms; $d=New-Object System.Windows.Forms.FolderBrowserDialog; if($d.ShowDialog() -eq 'OK'){$d.SelectedPath}else{'${CANCELED}'}`;

const WIN_CHOOSE_FILE_SCRIPT = `Add-Type -AssemblyName System.Windows.Forms; $d=New-Object System.Windows.Forms.OpenFileDialog; $d.Filter='Markdown files (*.md;*.markdown)|*.md;*.markdown'; if($d.ShowDialog() -eq 'OK'){$d.FileName}else{'${CANCELED}'}`;

const DIALOG_SCRIPTS: Record<TargetKind, { darwin: string; win32: string }> = {
  folder: { darwin: MAC_CHOOSE_FOLDER_SCRIPT, win32: WIN_CHOOSE_FOLDER_SCRIPT },
  file: { darwin: MAC_CHOOSE_FILE_SCRIPT, win32: WIN_CHOOSE_FILE_SCRIPT },
};

export async function pickPathViaDialog(
  kind: TargetKind,
  deps: Deps = {},
): Promise<string | null> {
  const resolved = resolveDeps(deps);
  const scripts = DIALOG_SCRIPTS[kind];
  let command: string;
  let args: string[];
  if (isDarwin(resolved.platform)) {
    command = "osascript";
    args = ["-e", scripts.darwin];
  } else if (isWindows(resolved.platform)) {
    command = "powershell";
    args = ["-NoProfile", "-STA", "-Command", scripts.win32];
  } else {
    return null;
  }
  let stdout: string;
  try {
    ({ stdout } = await resolved.execFileImpl(command, args));
  } catch {
    return null;
  }
  const out = stdout.trim();
  return !out || out === CANCELED ? null : out;
}

export type TargetResult =
  | { ok: true; path: string }
  | { ok: false; canceled: true }
  | { ok: false; canceled: false; error: string };

export async function resolveOpenTarget(
  kind: TargetKind,
  deps: Deps = {},
): Promise<TargetResult> {
  const picked = await pickPathViaDialog(kind, deps);
  if (!picked) return { ok: false, canceled: true };
  const result = await validatePath(kind, picked, deps);
  return result.ok
    ? result
    : { ok: false, canceled: false, error: result.error };
}
