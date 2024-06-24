import { captureException } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { spawnSync } from "node:child_process";

export const isStickiesRunning = () => {
  const shellRet = spawnSync("pgrep Stickies", { shell: true });
  return shellRet.output ? shellRet.stdout.toString() != "" : false;
};

const scriptStickiesWindowsCount = `
tell application "System Events"
  tell process "Stickies"
    set windowCount to count of (get every window)
    return windowCount
  end tell
end tell
`;

export async function stickiesWindowsCount() {
  try {
    if (isStickiesRunning()) {
      const count = await runAppleScript(scriptStickiesWindowsCount);
      return parseInt(count);
    }
  } catch (e) {
    captureException(e);
    console.error(e);
  }
  return 0;
}

const scriptStickiesWindowList = `
tell application "System Events"
  tell process "Stickies"
    set windowList to {}
    repeat with w in (get every window)
      set end of windowList to name of w
    end repeat
    return windowList
  end tell
end tell`;

export async function stickiesWindowList() {
  try {
    if (isStickiesRunning()) {
      const list = await runAppleScript(scriptStickiesWindowList);
      return list.split(",");
    }
  } catch (e) {
    captureException(e);
    console.error(e);
  }
  return undefined;
}

const scriptQuitStickies = `
tell application "Stickies"
    quit
end tell`;

export async function quitStickies() {
  try {
    await runAppleScript(scriptQuitStickies);
  } catch (e) {
    captureException(e);
    console.error(e);
  }
}

const scriptToggleStickiesWindows = `
tell application "System Events"
	set stickiesVisible to visible of process "Stickies"
	set visible of process "Stickies" to not stickiesVisible
	if not stickiesVisible then
	      set frontmost of process "Stickies" to true
  end if
  return not stickiesVisible
end tell
`;

export async function toggleStickiesWindows() {
  try {
    const visibility = await runAppleScript(scriptToggleStickiesWindows);
    return visibility === "true";
  } catch (e) {
    captureException(e);
    console.error(e);
    return false;
  }
}

const scriptShowStickiesWindows = `
tell application "System Events"
	set stickiesVisible to visible of process "Stickies"
	set visible of process "Stickies" to true
end tell
`;

export async function showStickiesWindows() {
  try {
    await runAppleScript(scriptShowStickiesWindows);
  } catch (e) {
    captureException(e);
    console.error(e);
  }
}

const scriptFloatOnTopStickies = `
tell application "System Events"
	tell application "Stickies" to activate
  tell process "Stickies"
	keystroke "f" using {option down, command down}
  end tell
end tell
`;

export async function floatOnTopStickies() {
  try {
    await runAppleScript(scriptFloatOnTopStickies);
  } catch (e) {
    captureException(e);
    console.error(e);
  }
}

const scriptCollapseStickies = `
tell application "System Events"
	tell application "Stickies" to activate
	tell process "Stickies"
	  keystroke "m" using {command down}
  end tell
end tell
`;

export async function collapseStickies() {
  try {
    await runAppleScript(scriptCollapseStickies);
  } catch (e) {
    captureException(e);
    console.error(e);
  }
}

const scriptNewStickiesNote = `
tell application "System Events"
	if exists process "Stickies" then
	  tell application "Stickies" to activate  
	  tell process "Stickies"
	    keystroke "n" using {command down} 
	  end tell
    else
    tell application "Stickies" to launch
	end if
end tell
`;

export async function newStickiesNote() {
  try {
    await runAppleScript(scriptNewStickiesNote);
  } catch (e) {
    captureException(e);
    console.error(e);
  }
}

const scriptCloseStickiesNote = `
tell application "System Events"
	tell application "Stickies" to activate
	tell process "Stickies"
	  keystroke "w" using {command down} 
	end tell
end tell
`;

export async function closeStickiesNote() {
  try {
    await runAppleScript(scriptCloseStickiesNote);
  } catch (e) {
    captureException(e);
    console.error(e);
  }
}
