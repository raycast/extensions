import { access } from "node:fs/promises";

import { closeMainWindow, getPreferenceValues, showToast, Toast } from "@raycast/api";

import { runAppleScript, runJavaScriptForAutomation } from "./applescript";
import type { WorkspaceLaunchTarget } from "./types";
import { getAppleScriptErrorMessage, getErrorMessage } from "./errors";
import { expandHome, toTildePath } from "./paths";
import { buildAppleScript, type RunGhosttyAppleScriptTarget } from "./workspace-script";

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
