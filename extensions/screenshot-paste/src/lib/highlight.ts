import { environment } from "@raycast/api";
import { execFile, spawn } from "node:child_process";
import path from "node:path";

export const HEARTBEAT_FILE = path.join(environment.supportPath, "highlight-heartbeat");

const HIGHLIGHT_JXA = `const raycastScreenshotPasteOverlay = true;
ObjC.import('Cocoa');
function run(argv) {
  const index = parseInt(argv[0], 10);
  const durationMs = parseInt(argv[1], 10);
  const heartbeatPath = argv[2];
  const app = $.NSApplication.sharedApplication;
  const screens = $.NSScreen.screens;
  const screen = screens.objectAtIndex(Math.min(index, screens.count - 1));
  const frame = screen.frame;
  const win = $.NSWindow.alloc.initWithContentRectStyleMaskBackingDefer(
    frame, $.NSWindowStyleMaskBorderless, $.NSBackingStoreBuffered, false);
  win.setLevel($.NSScreenSaverWindowLevel);
  win.setOpaque(false);
  win.setIgnoresMouseEvents(true);
  win.setBackgroundColor($.NSColor.colorWithSRGBRedGreenBlueAlpha(0.35, 0.45, 1.0, 0.28));
  win.setCollectionBehavior($.NSWindowCollectionBehaviorCanJoinAllSpaces | $.NSWindowCollectionBehaviorTransient);
  const label = $.NSTextField.labelWithString('' + (index + 1));
  label.setFont($.NSFont.boldSystemFontOfSize(220));
  label.setTextColor($.NSColor.whiteColor);
  label.sizeToFit;
  const size = label.frame.size;
  label.setFrameOrigin($.NSMakePoint((frame.size.width - size.width) / 2, (frame.size.height - size.height) / 2));
  win.contentView.addSubview(label);
  let screenName = '';
  try {
    const localizedName = screen.localizedName.js;
    screenName = localizedName == null ? '' : String(localizedName);
  } catch {}
  if (screenName) {
    const nameLabel = $.NSTextField.labelWithString(screenName);
    nameLabel.setFont($.NSFont.boldSystemFontOfSize(56));
    nameLabel.setTextColor($.NSColor.whiteColor);
    nameLabel.sizeToFit;
    const nameSize = nameLabel.frame.size;
    nameLabel.setFrameOrigin($.NSMakePoint((frame.size.width - nameSize.width) / 2, label.frame.origin.y - nameSize.height - 20));
    win.contentView.addSubview(nameLabel);
  }
  win.orderFrontRegardless;
  const deadline = Date.now() + durationMs;
  let absentChecks = 0;
  let missingHeartbeatChecks = 0;
  while (Date.now() < deadline) {
    const sliceMs = Math.min(150, deadline - Date.now());
    $.NSRunLoop.currentRunLoop.runUntilDate($.NSDate.dateWithTimeIntervalSinceNow(sliceMs / 1000));
    const ref = $.CGWindowListCopyWindowInfo($.kCGWindowListOptionOnScreenOnly | $.kCGWindowListExcludeDesktopElements, 0);
    const list = ObjC.deepUnwrap(ObjC.castRefToObject(ref));
    const raycastVisible = list.some((w) => w.kCGWindowOwnerName === "Raycast" && w.kCGWindowLayer === 8 && w.kCGWindowBounds.Width >= 300);
    absentChecks = raycastVisible ? 0 : absentChecks + 1;
    if (absentChecks >= 3) {
      win.close;
      return;
    }
    const fileManager = $.NSFileManager.defaultManager;
    const heartbeatAttributes = fileManager.fileExistsAtPath(heartbeatPath)
      ? fileManager.attributesOfItemAtPathError(heartbeatPath, null)
      : null;
    if (heartbeatAttributes === null || heartbeatAttributes.isNil()) {
      missingHeartbeatChecks += 1;
      if (missingHeartbeatChecks >= 3) {
        win.close;
        return;
      }
    } else {
      missingHeartbeatChecks = 0;
      const modifiedAt = heartbeatAttributes.objectForKey($.NSFileModificationDate);
      if (modifiedAt.isNil() || Date.now() - modifiedAt.timeIntervalSince1970 * 1000 > 700) {
        win.close;
        return;
      }
    }
  }
  win.close;
}`;

let lastPid: number | undefined;

export function killStrayOverlays(): Promise<void> {
  return new Promise((resolve) => {
    execFile("/usr/bin/pkill", ["-f", "raycastScreenshotPasteOverlay"], () => resolve());
  });
}

function killTrackedOverlay(): void {
  if (lastPid === undefined) {
    return;
  }

  try {
    process.kill(lastPid, "SIGTERM");
  } catch {
    lastPid = undefined;
  }

  lastPid = undefined;
}

export function stopHighlight(): void {
  killTrackedOverlay();
  void killStrayOverlays();
}

export function highlightDisplay(displayNumber: number): void {
  killTrackedOverlay();

  const child = spawn(
    "/usr/bin/osascript",
    ["-l", "JavaScript", "-e", HIGHLIGHT_JXA, String(displayNumber - 1), "60000", HEARTBEAT_FILE],
    { detached: true, stdio: "ignore" },
  );

  lastPid = child.pid;
  child.once("error", () => {
    if (lastPid === child.pid) {
      lastPid = undefined;
    }
  });
  child.once("exit", () => {
    if (lastPid === child.pid) {
      lastPid = undefined;
    }
  });
  child.unref();
}
