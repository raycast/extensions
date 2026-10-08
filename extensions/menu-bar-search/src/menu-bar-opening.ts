import { Toast, showToast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import {
  normalizeError,
  openMenuBarItem as openMenuBarItemWithHelper,
  resolveMenuBarItem,
} from "./helper-client";
import { openHint } from "./menu-bar-presentation";
import { Frame, MenuBarItem } from "./menu-bar-types";

export async function openSelectedMenuBarItem(
  helperPath: string,
  cachedItem: MenuBarItem,
  onRefresh: () => Promise<void> | void,
) {
  try {
    await openLiveMenuBarItem(helperPath, cachedItem);
  } catch (caughtError) {
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

async function openLiveMenuBarItem(
  helperPath: string,
  cachedItem: MenuBarItem,
) {
  // Rows on screen may be stale. The helper re-resolves them against the live
  // Accessibility tree, so the cached row only needs to be a usable hint.
  // Only stable identity facts gate this branch: frame and obscured state move
  // with the menu bar, so they are checked on the live item below.
  if (!mayFallbackToSystemEvents(cachedItem)) {
    await openMenuBarItemWithHelper(
      helperPath,
      cachedItem.id,
      openHint(cachedItem),
    );
    return;
  }

  // System Events clicks by position, so it only ever sees a frame the helper has just
  // matched by identity. If the item is gone, resolve throws item_not_found and nothing is clicked.
  const item = await resolveMenuBarItem(
    helperPath,
    cachedItem.id,
    openHint(cachedItem),
  );
  const trySystemEventsFirst = shouldOpenWithSystemEventsFirst(item);

  if (trySystemEventsFirst) {
    try {
      await openWithSystemEvents(item);
      return;
    } catch {
      // Let the helper open the item through its own policy.
    }
  }

  try {
    await openMenuBarItemWithHelper(helperPath, item.id, openHint(item));
  } catch (helperError) {
    if (trySystemEventsFirst || !canFallbackToSystemEvents(item))
      throw helperError;
    if (normalizeError(helperError).code === "item_not_found")
      throw helperError;

    try {
      await openWithSystemEvents(item);
    } catch {
      // Keep the helper error. It has the better user-facing recovery text.
      throw helperError;
    }
  }
}

function showMenuBarChangedToast() {
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

function mayFallbackToSystemEvents(item: MenuBarItem) {
  return Boolean(item.processName?.trim()) && item.category === "app:generic";
}

function canFallbackToSystemEvents(item: MenuBarItem) {
  return (
    mayFallbackToSystemEvents(item) &&
    canOpenWithSystemEvents(item) &&
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

  await runAppleScript(systemEventsClickScript(item.processName, item.frame), {
    timeout: 2500,
  });
}

// The frame comes from a live helper resolve, so System Events must find exactly one item
// of the same process at that geometry. Anything else means the menu bar changed.
const FRAME_TOLERANCE = 2;

function systemEventsClickScript(processName: string, frame: Frame) {
  return `
tell application "System Events"
  if not (exists process ${appleScriptString(processName)}) then error "process not found"
  tell process ${appleScriptString(processName)}
    if not (exists menu bar 2) then error "menu bar 2 not found"
    set matches to {}
    repeat with candidate in menu bar items of menu bar 2
      set candidatePosition to position of candidate
      set candidateSize to size of candidate
      set deviation to my absolute((item 1 of candidatePosition) - (${frame.x}))
      set deviation to deviation + (my absolute((item 2 of candidatePosition) - (${frame.y})))
      set deviation to deviation + (my absolute((item 1 of candidateSize) - (${frame.width})))
      set deviation to deviation + (my absolute((item 2 of candidateSize) - (${frame.height})))
      if deviation ≤ ${FRAME_TOLERANCE} then set end of matches to contents of candidate
    end repeat
    if (count of matches) is 0 then error "menu bar item not found"
    if (count of matches) > 1 then error "menu bar item is ambiguous"
    click item 1 of matches
  end tell
end tell

on absolute(value)
  if value < 0 then return -value
  return value
end absolute
`;
}

function appleScriptString(value: string) {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}
