import { Toast, showToast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import {
  normalizeError,
  openMenuBarItem as openMenuBarItemWithHelper,
} from "./helper-client";
import { openHint } from "./menu-bar-presentation";
import { MenuBarItem } from "./menu-bar-types";

export async function openSelectedMenuBarItem(
  helperPath: string,
  item: MenuBarItem,
  onRefresh: () => Promise<void> | void,
) {
  const trySystemEventsFirst = shouldOpenWithSystemEventsFirst(item);

  try {
    if (trySystemEventsFirst) {
      try {
        await openWithSystemEvents(item);
        return;
      } catch {
        // Let the helper re-resolve the item against the live Accessibility tree.
      }
    }

    await openMenuBarItemWithHelper(helperPath, item.id, openHint(item));
  } catch (caughtError) {
    if (!trySystemEventsFirst && canFallbackToSystemEvents(item)) {
      try {
        await openWithSystemEvents(item);
        return;
      } catch {
        // Keep the helper error below. It has the better user-facing recovery text.
      }
    }

    const error = normalizeError(caughtError);
    if (error.code === "item_not_found") {
      await Promise.resolve(onRefresh());
      await showMenuBarChangedToast();
      return;
    }

    await showToast({
      style: Toast.Style.Failure,
      title: error.message ?? "Unable to open menu bar item",
      message: error.recoverySuggestion,
    });
  }
}

export function showMenuBarChangedToast() {
  return showToast({
    style: Toast.Style.Success,
    title: "Menu bar changed",
    message: "The list has been refreshed.",
  });
}

function shouldOpenWithSystemEventsFirst(item: MenuBarItem) {
  return (
    canFallbackToSystemEvents(item) &&
    item.openStrategy === "click" &&
    item.isObscured !== true
  );
}

function canFallbackToSystemEvents(item: MenuBarItem) {
  return (
    canOpenWithSystemEvents(item) &&
    item.category === "app:generic" &&
    item.isObscured !== true
  );
}

function canOpenWithSystemEvents(item: MenuBarItem) {
  return Boolean(item.processName?.trim() && item.frame);
}

async function openWithSystemEvents(item: MenuBarItem) {
  if (!item.processName?.trim() || !item.frame) {
    throw new Error("Missing process name or frame");
  }

  const clickX = item.frame.x + item.frame.width / 2;
  const clickY = item.frame.y + item.frame.height / 2;
  const tolerance = Math.max(item.frame.width, item.frame.height);

  await runAppleScript(
    systemEventsClickScript(item.processName, clickX, clickY, tolerance),
    {
      timeout: 2500,
    },
  );
}

function systemEventsClickScript(
  processName: string,
  clickX: number,
  clickY: number,
  tolerance: number,
) {
  return `
tell application "System Events"
  if not (exists process ${appleScriptString(processName)}) then error "process not found"
  tell process ${appleScriptString(processName)}
    if not (exists menu bar 2) then error "menu bar 2 not found"
    set bestItem to missing value
    set bestDistance to 1000000
    repeat with candidate in menu bar items of menu bar 2
      set candidatePosition to position of candidate
      set candidateSize to size of candidate
      set candidateCenterX to (item 1 of candidatePosition) + ((item 1 of candidateSize) / 2)
      set candidateCenterY to (item 2 of candidatePosition) + ((item 2 of candidateSize) / 2)
      set deltaX to candidateCenterX - ${clickX}
      if deltaX < 0 then set deltaX to -deltaX
      set deltaY to candidateCenterY - ${clickY}
      if deltaY < 0 then set deltaY to -deltaY
      set candidateDistance to deltaX + deltaY
      if candidateDistance < bestDistance then
        set bestDistance to candidateDistance
        set bestItem to candidate
      end if
    end repeat
    if bestItem is missing value then error "menu bar item not found"
    if bestDistance > ${tolerance} then error "menu bar item moved"
    click bestItem
    return bestDistance as text
  end tell
end tell
`;
}

function appleScriptString(value: string) {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}
