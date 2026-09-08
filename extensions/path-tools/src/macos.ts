import { execFile } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

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
      error "Finder 中没有可打开的选中项或窗口。"
    end try
  end tell
end run`;

const finderFolderScript = `
on run argv
  tell application "Finder"
    try
      return POSIX path of (folder of the front window as alias)
    on error
      error "请先打开一个 Finder 窗口。"
    end try
  end tell
end run`;

async function runAppleScript(
  script: string,
  args: string[] = [],
): Promise<string> {
  const { stdout } = await execFileAsync("/usr/bin/osascript", [
    "-e",
    script,
    ...args,
  ]);
  return stdout.trim();
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

export async function openItermDirectoryInFinder(): Promise<void> {
  // iTerm does not expose a portable current-working-directory API. Running open inside
  // its active shell lets Finder resolve the directory from that shell session.
  await runAppleScript(
    `
tell application "iTerm"
  if (count of windows) is 0 then error "iTerm 没有打开的窗口。"
  tell current session of current window to write text "open -a Finder ./"
end tell`,
  );
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
