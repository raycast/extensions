import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { LayoutPlacement, LayoutPreset } from "./types";

const execFileAsync = promisify(execFile);

export async function applyLayoutToFocusedWindow(
  layout: Pick<LayoutPreset, "widthPercentage" | "heightPercentage" | "placement">,
) {
  const placement: LayoutPlacement = layout.placement ?? "center";
  const script = `
    ObjC.import("AppKit");

    const widthPercentage = ${JSON.stringify(layout.widthPercentage)};
    const heightPercentage = ${JSON.stringify(layout.heightPercentage)};
    const placement = ${JSON.stringify(placement)};
    const screen = $.NSScreen.mainScreen;
    const visibleFrame = screen.visibleFrame;
    const fullFrame = screen.frame;

    const visibleX = Number(visibleFrame.origin.x);
    const visibleY = Number(visibleFrame.origin.y);
    const visibleWidth = Number(visibleFrame.size.width);
    const visibleHeight = Number(visibleFrame.size.height);
    const fullHeight = Number(fullFrame.size.height);

    const targetWidth = Math.round(visibleWidth * widthPercentage / 100);
    const targetHeight = Math.round(visibleHeight * heightPercentage / 100);
    const leftX = visibleX;
    const centerX = visibleX + ((visibleWidth - targetWidth) / 2);
    const rightX = visibleX + visibleWidth - targetWidth;
    const topY = fullHeight - (visibleY + visibleHeight);
    const middleY = topY + ((visibleHeight - targetHeight) / 2);
    const bottomY = topY + visibleHeight - targetHeight;

    const horizontalPosition = placement.includes("left")
      ? leftX
      : placement.includes("right")
        ? rightX
        : centerX;
    const verticalPosition = placement.includes("top")
      ? topY
      : placement.includes("bottom")
        ? bottomY
        : middleY;
    const targetX = Math.round(horizontalPosition);
    const targetY = Math.round(verticalPosition);

    const systemEvents = Application("System Events");
    const frontmostProcesses = systemEvents.processes.whose({ frontmost: true })();

    if (frontmostProcesses.length === 0) {
      throw new Error("No focused application was found.");
    }

    const process = frontmostProcesses[0];
    const windows = process.windows();

    if (windows.length === 0) {
      throw new Error("The focused application does not have a resizable window.");
    }

    const window = windows[0];
    window.position = [targetX, targetY];
    window.size = [targetWidth, targetHeight];
  `;

  try {
    await execFileAsync("/usr/bin/osascript", ["-l", "JavaScript", "-e", script]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to resize the focused window.";
    throw new Error(cleanAppleScriptError(message));
  }
}

function cleanAppleScriptError(message: string) {
  if (message.includes("not authorized") || message.includes("assistive access")) {
    return "Mactile needs Accessibility permission in System Settings to resize windows.";
  }

  return message.replace(/^Command failed:.*?\n/s, "").trim();
}
