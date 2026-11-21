import { Action, closeMainWindow, getPreferenceValues, Icon, open, showHUD } from "@raycast/api";
import { execFile } from "child_process";
import { homedir } from "os";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// Both scripts fall back to opening a new window when Finder has none to reuse.
const CURRENT_TAB_SCRIPT = `
on run argv
  set targetFolder to POSIX file (item 1 of argv) as alias
  tell application "Finder"
    if (count of Finder windows) is 0 then
      open targetFolder
    else
      set target of Finder window 1 to targetFolder
    end if
    activate
  end tell
end run`;

// Finder has no scripting command for tabs, so a new tab is ⌘T sent through System Events
// (hence the Accessibility requirement), then retargeted once it exists. Each tab counts as
// a Finder window, which is how the new one is detected. If Finder never takes focus or the
// tab never appears, the script errors out rather than sending ⌘T elsewhere or retargeting
// the current tab, and openFolder falls back to a new window.
const NEW_TAB_SCRIPT = `
on run argv
  set targetFolder to POSIX file (item 1 of argv) as alias
  tell application "Finder"
    if (count of Finder windows) is 0 then
      open targetFolder
      activate
      return
    end if
    activate
    set windowCount to count of Finder windows
  end tell
  tell application "System Events"
    repeat 40 times
      if frontmost of process "Finder" then exit repeat
      delay 0.05
    end repeat
    if not (frontmost of process "Finder") then error "Finder did not come to the front"
    keystroke "t" using command down
  end tell
  tell application "Finder"
    repeat 40 times
      if (count of Finder windows) > windowCount then exit repeat
      delay 0.05
    end repeat
    if (count of Finder windows) is not greater than windowCount then error "Finder did not open a new tab"
    set target of Finder window 1 to targetFolder
  end tell
end run`;

function expandHome(path: string): string {
  return path === "~" || path.startsWith("~/") ? homedir() + path.slice(1) : path;
}

function getOpenMode(): Preferences["openFoldersIn"] {
  return getPreferenceValues<Preferences>().openFoldersIn;
}

export async function openFolder(path: string): Promise<void> {
  const mode = getOpenMode();
  if (mode === "newWindow") {
    await open(path);
    return;
  }

  // Close Raycast first, or the ⌘T lands in Raycast instead of Finder.
  await closeMainWindow();
  try {
    await execFileAsync("osascript", ["-e", mode === "newTab" ? NEW_TAB_SCRIPT : CURRENT_TAB_SCRIPT, expandHome(path)]);
  } catch {
    await open(path);
    await showHUD("Could not control Finder, opened in a new window");
  }
}

export function OpenFolderAction({ path, title, onOpen }: { path: string; title: string; onOpen?: () => void }) {
  if (getOpenMode() === "newWindow") {
    return <Action.Open title={title} target={path} onOpen={onOpen} />;
  }

  return (
    <Action
      title={title}
      icon={Icon.Finder}
      onAction={async () => {
        await openFolder(path);
        onOpen?.();
      }}
    />
  );
}
