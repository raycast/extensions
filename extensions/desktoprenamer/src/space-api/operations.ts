import {
  type SpaceAPISnapshot,
  type SpaceAPIOperationResult,
  type SpaceAPIInfo,
  type SpaceAPISpaceRecord,
  type SpaceAPIWindowAction,
  type SpaceAPIWindowEntry,
  type SpaceAPIWindowSpaceRecord,
  type SpaceAPIWindowsSnapshot,
} from "./contract";
import { runDesktopRenamerMethod, type DesktopRenamerRequestOptions } from "./transport";

export interface CurrentSpaceSnapshot {
  spacesByDisplay: Record<string, string>;
}

const SPACE_SWITCH_POLL_INTERVAL_MS = 100;
const SPACE_SWITCH_TIMEOUT_MS = 2000;

export async function getCurrentSpacesByDisplay(): Promise<CurrentSpaceSnapshot> {
  const snapshot = await getSpaceSnapshot();
  const spacesByID = new Map(snapshot.spaces.map((space) => [space.id, space.displayID]));
  const spacesByDisplay: Record<string, string> = {};
  snapshot.currentSpaceIDs.forEach((spaceID, index) => {
    spacesByDisplay[spacesByID.get(spaceID) ?? `display-${index}`] = spaceID;
  });
  return { spacesByDisplay };
}

export async function restoreSpacesByDisplay(snapshot: CurrentSpaceSnapshot): Promise<void> {
  let currentSpaces: CurrentSpaceSnapshot | undefined;
  try {
    currentSpaces = await getCurrentSpacesByDisplay();
  } catch {
    // The restore itself remains authoritative if the read-back is unavailable.
  }

  for (const [displayID, spaceID] of Object.entries(snapshot.spacesByDisplay)) {
    if (currentSpaces?.spacesByDisplay[displayID] === spaceID) continue;

    await switchToSpace(spaceID);
    await waitForSpaceToBecomeCurrent(spaceID);
  }
}

export async function focusWindowOnSpace(windowID: number, pid: number, spaceID: string): Promise<void> {
  await switchToSpace(spaceID);
  await waitForSpaceToBecomeCurrent(spaceID);
  await focusWindow(windowID, pid);
}

async function waitForSpaceToBecomeCurrent(spaceID: string): Promise<void> {
  const deadline = Date.now() + SPACE_SWITCH_TIMEOUT_MS;

  while (Date.now() < deadline) {
    try {
      const currentSpaceIDs = await getCurrentSpaceIDs();
      if (currentSpaceIDs.includes(spaceID)) return;
    } catch {
      // Keep polling. The space switch may still be settling, and the next
      // read can succeed after Mission Control finishes updating its state.
    }

    await new Promise((resolve) => setTimeout(resolve, SPACE_SWITCH_POLL_INTERVAL_MS));
  }

  throw new Error(`DesktopRenamer did not activate space ${spaceID} in time.`);
}

export async function getSpaceSnapshot(errorMessage = "Failed to read spaces"): Promise<SpaceAPISnapshot> {
  return await runDesktopRenamerMethod("getSpaceSnapshot", {}, errorMessage);
}

export async function getAPIInfo(errorMessage = "Failed to read API information"): Promise<SpaceAPIInfo> {
  return await runDesktopRenamerMethod("getAPIInfo", {}, errorMessage);
}

export async function getWindowsSnapshot(errorMessage = "Failed to read windows"): Promise<SpaceAPIWindowsSnapshot> {
  return await runDesktopRenamerMethod("getWindows", {}, errorMessage);
}

export function mapWindowsSnapshot(snapshot: SpaceAPIWindowsSnapshot): {
  spaces: SpaceAPIWindowSpaceRecord[];
  windows: SpaceAPIWindowEntry[];
} {
  const spaces = snapshot.spaces.map((space) => ({
    id: space.id,
    name: space.name,
    displayID: space.displayID,
    displayName: space.displayName,
    num: space.number,
    isFullscreen: space.isFullscreen,
  }));
  const spacesByID = new Map(spaces.map((space) => [space.id, space]));
  const windows = snapshot.windows.flatMap((window) => {
    const space = spacesByID.get(window.spaceID);
    if (!space) return [];
    return [
      {
        windowID: window.id,
        pid: window.pid,
        ownerName: window.ownerName,
        appPath: window.appPath ?? "",
        title: window.title ?? "",
        isMinimized: window.isMinimized,
        isHidden: window.isHidden,
        space: { ...space },
      },
    ];
  });
  return { spaces, windows };
}

export async function getAllSpaces(errorMessage = "Failed to read spaces"): Promise<SpaceAPISpaceRecord[]> {
  return await runDesktopRenamerMethod("getAllSpaces", {}, errorMessage);
}

export async function getCurrentSpaceName(errorMessage = "Failed to read the current space"): Promise<string> {
  return await runDesktopRenamerMethod("getCurrentSpaceName", {}, errorMessage);
}

export async function getCurrentSpaceIDs(errorMessage = "Failed to read the current spaces"): Promise<string[]> {
  return await runDesktopRenamerMethod("getCurrentSpaceID", {}, errorMessage);
}

export async function switchToSpace(
  spaceID: string,
  errorMessage = "Failed to switch space",
): Promise<SpaceAPIOperationResult> {
  return await runDesktopRenamerMethod("switchToSpace", { spaceID }, errorMessage);
}

export async function toggleLockSpace(
  spaceID: string,
  errorMessage = "Failed to toggle Space Lock",
): Promise<SpaceAPIOperationResult> {
  return await runDesktopRenamerMethod("toggleLockSpace", { spaceID }, errorMessage);
}

export async function restoreMovedWindows(
  errorMessage = "Failed to restore moved windows",
): Promise<SpaceAPIOperationResult> {
  return await runDesktopRenamerMethod("restoreMovedWindows", {}, errorMessage);
}

export async function renameCurrentSpace(
  name: string,
  errorMessage = "Failed to rename space",
): Promise<SpaceAPIOperationResult> {
  return await runDesktopRenamerMethod("renameCurrentSpace", { name }, errorMessage);
}

export async function renameSpace(
  spaceID: string,
  name: string,
  errorMessage = "Failed to rename space",
): Promise<SpaceAPIOperationResult> {
  return await runDesktopRenamerMethod("renameSpace", { spaceID, name }, errorMessage);
}

export async function rearrangeSpace(
  spaceID: string,
  direction: "up" | "down",
  errorMessage = "Failed to rearrange space",
): Promise<SpaceAPIOperationResult> {
  return await runDesktopRenamerMethod("rearrangeSpace", { spaceID, direction }, errorMessage);
}

export async function moveWindowNext(errorMessage = "Failed to move window"): Promise<SpaceAPIOperationResult> {
  return await runDesktopRenamerMethod("moveWindowNext", {}, errorMessage);
}

export async function moveWindowPrevious(errorMessage = "Failed to move window"): Promise<SpaceAPIOperationResult> {
  return await runDesktopRenamerMethod("moveWindowPrevious", {}, errorMessage);
}

export async function moveWindowToSpace(
  spaceID: string,
  errorMessage = "Failed to move window",
): Promise<SpaceAPIOperationResult> {
  return await runDesktopRenamerMethod("moveWindowToSpace", { spaceID }, errorMessage);
}

export async function reloadSpaceLabels(
  errorMessage = "Failed to reload space labels",
): Promise<SpaceAPIOperationResult> {
  return await runDesktopRenamerMethod("reloadSpaceLabels", {}, errorMessage);
}

export async function toggleMenubar(errorMessage = "Failed to toggle menubar"): Promise<boolean> {
  return await runDesktopRenamerMethod("toggleMenubar", {}, errorMessage);
}

export async function toggleLauncher(errorMessage = "Failed to toggle launcher"): Promise<boolean> {
  return await runDesktopRenamerMethod("toggleLauncher", {}, errorMessage);
}

export async function toggleLabels(errorMessage = "Failed to toggle labels"): Promise<boolean> {
  return await runDesktopRenamerMethod("toggleLabels", {}, errorMessage);
}

export async function toggleActiveLabel(errorMessage = "Failed to toggle active label"): Promise<boolean> {
  return await runDesktopRenamerMethod("toggleActiveLabel", {}, errorMessage);
}

export async function togglePreviewLabel(errorMessage = "Failed to toggle preview label"): Promise<boolean> {
  return await runDesktopRenamerMethod("togglePreviewLabel", {}, errorMessage);
}

export async function toggleDesktopVisibility(errorMessage = "Failed to toggle desktop visibility"): Promise<boolean> {
  return await runDesktopRenamerMethod("toggleDesktopVisibility", {}, errorMessage);
}

export async function focusWindow(
  windowID: number,
  pid: number,
  errorMessage = "Failed to focus window",
): Promise<SpaceAPIOperationResult> {
  return await runDesktopRenamerMethod("focusWindow", { windowID, pid }, errorMessage);
}

export async function executeWindowAction(
  windowID: number,
  pid: number,
  action: SpaceAPIWindowAction,
  errorMessage = "Failed to execute window action",
  options: DesktopRenamerRequestOptions = {},
): Promise<SpaceAPIOperationResult> {
  return await runDesktopRenamerMethod("executeWindowAction", { windowID, pid, action }, errorMessage, options);
}

export async function moveSpecificWindow(
  args: {
    windowID: number;
    pid?: number;
    fromSpaceID: string;
    targetSpaceID: string;
    isMinimized?: boolean;
    isHidden?: boolean;
  },
  errorMessage = "Failed to move window",
): Promise<SpaceAPIOperationResult> {
  return await runDesktopRenamerMethod("moveSpecificWindow", args, errorMessage);
}

export async function moveSpecificWindowToSpace(args: {
  windowID: number;
  pid?: number;
  fromSpaceID: string;
  targetSpaceID: string;
  isMinimized?: boolean;
  isHidden?: boolean;
}): Promise<SpaceAPIOperationResult> {
  return await moveSpecificWindow(args);
}
