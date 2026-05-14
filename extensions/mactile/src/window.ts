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
    const mainScreen = $.NSScreen.mainScreen;
    const fullHeight = Number(mainScreen.frame.size.height);
    const selectedScreen = getFocusedWindowScreen(window) || getActiveScreen() || mainScreen;
    const visibleFrame = selectedScreen.visibleFrame;

    const visibleX = Number(visibleFrame.origin.x);
    const visibleY = Number(visibleFrame.origin.y);
    const visibleWidth = Number(visibleFrame.size.width);
    const visibleHeight = Number(visibleFrame.size.height);
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

    window.position = [targetX, targetY];
    window.size = [targetWidth, targetHeight];

    function getFocusedWindowScreen(window) {
      try {
        const position = window.position();
        const size = window.size();
        const centerPoint = {
          x: Number(position[0]) + Number(size[0]) / 2,
          y: Number(position[1]) + Number(size[1]) / 2,
        };

        return findScreenContainingAXPoint(centerPoint);
      } catch {
        return null;
      }
    }

    function getActiveScreen() {
      try {
        const mousePoint = $.NSEvent.mouseLocation;
        return findScreenContainingAppKitPoint({
          x: Number(mousePoint.x),
          y: Number(mousePoint.y),
        });
      } catch {
        return null;
      }
    }

    function findScreenContainingAXPoint(point) {
      return findScreen((screen) => {
        const visibleFrame = screen.visibleFrame;
        const x = Number(visibleFrame.origin.x);
        const y = fullHeight - (Number(visibleFrame.origin.y) + Number(visibleFrame.size.height));
        const width = Number(visibleFrame.size.width);
        const height = Number(visibleFrame.size.height);

        return point.x >= x && point.x <= x + width && point.y >= y && point.y <= y + height;
      });
    }

    function findScreenContainingAppKitPoint(point) {
      return findScreen((screen) => {
        const frame = screen.frame;
        const x = Number(frame.origin.x);
        const y = Number(frame.origin.y);
        const width = Number(frame.size.width);
        const height = Number(frame.size.height);

        return point.x >= x && point.x <= x + width && point.y >= y && point.y <= y + height;
      });
    }

    function findScreen(predicate) {
      const screens = $.NSScreen.screens;

      for (let index = 0; index < screens.count; index += 1) {
        const screen = screens.objectAtIndex(index);

        if (predicate(screen)) {
          return screen;
        }
      }

      return null;
    }
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
    return "MacTile needs Accessibility permission in System Settings to resize windows.";
  }

  return message.replace(/^Command failed:.*?\n/s, "").trim();
}
