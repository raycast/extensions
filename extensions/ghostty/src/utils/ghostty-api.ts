import { access } from "node:fs/promises";

import { closeMainWindow, getPreferenceValues, showToast, Toast } from "@raycast/api";

import { runAppleScript, runJavaScriptForAutomation } from "./applescript";
import type { WorkspaceLaunchTarget } from "./types";
import { getAppleScriptErrorMessage, getErrorMessage } from "./errors";
import { appleScriptString, expandHome, getDirectoryName, toTildePath } from "./paths";

type RunGhosttyAppleScriptTarget = {
  workspaceName: string;
  directory: string;
  layout: WorkspaceLaunchTarget["layout"];
  autoFocus: boolean;
};

export async function openWorkspace(target: WorkspaceLaunchTarget) {
  const directory = expandHome(target.directory);
  const layout = target.layout;
  const autoFocus = getPreferenceValues<Preferences>().autoFocusGhostty ?? true;

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Opening ${target.title}`,
    message: layout.title,
  });

  try {
    await access(directory);
    const result = await runGhosttyAppleScript({
      workspaceName: target.title,
      directory,
      layout: target.layout,
      autoFocus,
    });

    toast.style = Toast.Style.Success;
    toast.title = result === "focused-existing" ? `Focused ${target.title}` : `Opened ${target.title}`;
    toast.message = toTildePath(directory);

    await closeMainWindow();

    if (autoFocus) {
      try {
        await moveMouseToFirstPanelCenter();
      } catch {
        // Workspace opening succeeded; mouse positioning is best-effort only.
      }
    }
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = `Couldn't open ${target.title}`;
    toast.message = getErrorMessage(error);
  }
}

async function runGhosttyAppleScript(target: RunGhosttyAppleScriptTarget) {
  const script = buildAppleScript(target);

  try {
    const result = await runAppleScript(script);
    return result === "focused-existing" ? "focused-existing" : "opened-new";
  } catch (error) {
    const message = getAppleScriptErrorMessage(error);
    throw new Error(message);
  }
}

async function moveMouseToFirstPanelCenter() {
  const script = `
ObjC.import("CoreGraphics");

const systemEvents = Application("System Events");
const ghosttyProcess = systemEvents.processes.byName("Ghostty");

if (!ghosttyProcess.exists()) {
  throw new Error("Ghostty process is unavailable.");
}

const frontWindow = ghosttyProcess.windows[0];

if (!frontWindow.exists()) {
  throw new Error("Ghostty front window is unavailable.");
}

const position = frontWindow.position();
const size = frontWindow.size();
const x = position[0] + Math.floor(size[0] / 4);
const y = position[1] + Math.floor(size[1] / 2);

$.CGWarpMouseCursorPosition($.CGPointMake(x, y));
$.CGAssociateMouseAndMouseCursorPosition(true);
  `;

  try {
    await runJavaScriptForAutomation(script);
  } catch (error) {
    const message = getErrorMessage(error);
    throw new Error(
      message.includes("not allowed") || message.includes("Not authorized")
        ? "Ghostty was opened, but moving the mouse requires Accessibility permission for osascript/System Events."
        : message,
    );
  }
}

function buildAppleScript(target: RunGhosttyAppleScriptTarget) {
  if (target.layout.tabs.length === 0) {
    throw new Error(`Layout \`${target.layout.id}\` must contain at least one tab.`);
  }

  const lines = [
    `set workspaceName to ${appleScriptString(target.workspaceName)}`,
    `set shouldActivate to ${target.autoFocus ? "true" : "false"}`,
    'set ghosttyWasRunning to application "Ghostty" is running',
    `set openInNewWindow to ${target.layout.openInNewWindow === true ? "true" : "false"}`,
    `set projectDir to ${appleScriptString(target.directory)}`,
    `set windowTitle to ${appleScriptString(target.layout.windowTitle ?? getDirectoryName(target.directory))}`,
    "",
    "if ghosttyWasRunning is false then",
    '    tell application "Ghostty" to launch',
    "end if",
    "",
    'tell application "Ghostty"',
    "    if shouldActivate then",
    "        activate",
    "    end if",
    "",
    "    if (count of windows) is not 0 then",
    "        set matchedWindow to missing value",
    "        set matchedTab to missing value",
    "",
    "        repeat with candidateWindow in windows",
    "            repeat with candidateTab in tabs of candidateWindow",
    "                if (name of candidateTab) is workspaceName or (name of candidateTab) is windowTitle then",
    "                    set matchedWindow to candidateWindow",
    "                    set matchedTab to candidateTab",
    "                    exit repeat",
    "                end if",
    "            end repeat",
    "",
    "            if matchedTab is missing value and (name of candidateWindow) is windowTitle then",
    "                repeat with candidateTerminal in terminals of candidateWindow",
    "                    if (working directory of candidateTerminal) is projectDir then",
    "                        set matchedWindow to candidateWindow",
    "                        set matchedTab to selected tab of candidateWindow",
    "                        exit repeat",
    "                    end if",
    "                end repeat",
    "            end if",
    "",
    "            if matchedTab is not missing value then",
    "                exit repeat",
    "            end if",
    "        end repeat",
    "",
    "        if matchedTab is not missing value then",
    "            select tab matchedTab",
    "            if shouldActivate then",
    "                activate window matchedWindow",
    "            end if",
    "            focus (focused terminal of matchedTab)",
    '            return "focused-existing"',
    "        end if",
    "    end if",
    "",
    "    set targetWindow to missing value",
  ];

  let focusTabVar = "tab1";
  let focusPaneVar = "tab1pane1";

  target.layout.tabs.forEach((tab, tabIndex) => {
    const tabVar = `tab${tabIndex + 1}`;
    const cfgVar = `cfg${tabIndex + 1}`;
    const tabDir = expandHome(tab.workingDirectory ?? target.directory);

    lines.push(`    set ${cfgVar} to new surface configuration`);
    lines.push(`    set initial working directory of ${cfgVar} to ${appleScriptString(tabDir)}`);

    if (tabIndex === 0) {
      lines.push("    if openInNewWindow or (count of windows) is 0 then");
      lines.push(`        set targetWindow to new window with configuration ${cfgVar}`);
      lines.push(`        set ${tabVar} to selected tab of targetWindow`);
      lines.push("    else");
      lines.push("        set targetWindow to front window");
      lines.push(`        set ${tabVar} to new tab in targetWindow with configuration ${cfgVar}`);
      lines.push(`        select tab ${tabVar}`);
      lines.push("        if shouldActivate then");
      lines.push("            activate window targetWindow");
      lines.push("        end if");
      lines.push("    end if");
    } else {
      lines.push(`    set ${tabVar} to new tab in targetWindow with configuration ${cfgVar}`);
    }

    tab.panes.forEach((pane, paneIndex) => {
      const paneVar = `${tabVar}pane${paneIndex + 1}`;

      if (paneIndex === 0) {
        lines.push(`    set ${paneVar} to terminal 1 of ${tabVar}`);
      } else {
        const splitFromIndex = pane.splitFrom ?? 0;
        const parentPaneVar = `${tabVar}pane${splitFromIndex + 1}`;
        lines.push(`    set ${paneVar} to split ${parentPaneVar} direction ${pane.split} with configuration ${cfgVar}`);
      }

      if (pane.command) {
        lines.push(`    input text ${appleScriptString(pane.command)} to ${paneVar}`);
        lines.push(`    send key "enter" to ${paneVar}`);
      }

      if (pane.focus) {
        focusTabVar = tabVar;
        focusPaneVar = paneVar;
      }
    });

    const firstPaneVar = `${tabVar}pane1`;
    const tabTitle = tab.title?.trim();

    if (tabTitle) {
      lines.push(`    my setGhosttyTitleAction(${firstPaneVar}, "set_tab_title", ${appleScriptString(tabTitle)})`);
    }

    if (tabIndex === 0) {
      lines.push(`    my setGhosttyTitleAction(${firstPaneVar}, "set_window_title", windowTitle)`);
    }

    lines.push("");
  });

  lines.push(`    select tab ${focusTabVar}`);
  lines.push("    if shouldActivate then");
  lines.push("        activate window targetWindow");
  lines.push("    end if");
  lines.push(`    focus ${focusPaneVar}`);
  lines.push('    return "opened-new"');
  lines.push("end tell");
  lines.push("");
  lines.push("on setGhosttyTitleAction(targetTerminal, actionName, titleValue)");
  lines.push("    try");
  lines.push('        tell application "Ghostty"');
  lines.push('            perform action (actionName & ":" & titleValue) on targetTerminal');
  lines.push("        end tell");
  lines.push("    end try");
  lines.push("end setGhosttyTitleAction");

  return lines.join("\n");
}
