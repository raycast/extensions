import { SpaceAPIParameters, SpaceAPIMethod } from "./contract";

export function escapeAppleScriptString(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t");
}

export function parseSpaceAPICommand(
  command: string,
): { name: SpaceAPIMethod; arguments: Record<string, string> } | null {
  const quoted = (value: string) => value.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  if (command === "get api version") return { name: "getAPIVersion", arguments: {} };
  if (command === "get current space name") return { name: "getCurrentSpaceName", arguments: {} };
  if (command === "get current space id") return { name: "getCurrentSpaceID", arguments: {} };
  if (command === "get all spaces") return { name: "getAllSpaces", arguments: {} };
  if (command === "move window next") return { name: "moveWindowNext", arguments: {} };
  if (command === "move window previous") return { name: "moveWindowPrevious", arguments: {} };
  if (command === "restore moved windows") return { name: "restoreMovedWindows", arguments: {} };
  if (command === "reload space labels") return { name: "reloadSpaceLabels", arguments: {} };
  if (command === "toggle menubar") return { name: "toggleMenubar", arguments: {} };
  if (command === "toggle launcher") return { name: "toggleLauncher", arguments: {} };
  if (command === "toggle labels") return { name: "toggleLabels", arguments: {} };
  if (command === "toggle active label") return { name: "toggleActiveLabel", arguments: {} };
  if (command === "toggle preview label") return { name: "togglePreviewLabel", arguments: {} };
  if (command === "toggle desktop visibility") return { name: "toggleDesktopVisibility", arguments: {} };

  let match = command.match(/^switch to space "(.*)"$/);
  if (match) return { name: "switchToSpace", arguments: { spaceID: quoted(match[1]) } };
  match = command.match(/^toggle lock space "(.*)"$/);
  if (match) return { name: "toggleLockSpace", arguments: { spaceID: quoted(match[1]) } };
  match = command.match(/^rename current space "(.*)"$/);
  if (match) return { name: "renameCurrentSpace", arguments: { name: quoted(match[1]) } };
  match = command.match(/^rename space "(.*)" to "(.*)"$/);
  if (match) return { name: "renameSpace", arguments: { spaceID: quoted(match[1]), name: quoted(match[2]) } };
  match = command.match(/^move window to space "(.*)"$/);
  if (match) return { name: "moveWindowToSpace", arguments: { spaceID: quoted(match[1]) } };
  match = command.match(/^rearrange space "(.*)" direction "(up|down)"$/);
  if (match) return { name: "rearrangeSpace", arguments: { spaceID: quoted(match[1]), direction: match[2] } };
  match = command.match(/^focus window (\d+) pid (\d+)$/);
  if (match) return { name: "focusWindow", arguments: { windowID: match[1], pid: match[2] } };
  match = command.match(/^execute window action "(\d+)" pid "(\d+)" action "([^"]+)"$/);
  if (match) return { name: "executeWindowAction", arguments: { windowID: match[1], pid: match[2], action: match[3] } };
  match = command.match(/^move specific window "(\d+)"(?: pid "(\d+)")? from space "(.*)" to space "(.*)"$/);
  if (match) {
    const [, windowID, pid, fromSpaceID, targetSpaceID] = match;
    return {
      name: "moveSpecificWindow",
      arguments: {
        windowID,
        ...(pid ? { pid } : {}),
        fromSpaceID: quoted(fromSpaceID),
        targetSpaceID: quoted(targetSpaceID),
      },
    };
  }
  return null;
}

export function makeAppleScriptForMethod(command: SpaceAPIMethod, arguments_: SpaceAPIParameters): string {
  const stringValue = (key: string): string => {
    const value = arguments_[key];
    if (typeof value !== "string" || value.length === 0) throw new Error(`Missing ${key}.`);
    return escapeAppleScriptString(value);
  };
  const integerValue = (key: string): string => {
    const value = arguments_[key];
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) throw new Error(`Invalid ${key}.`);
    return String(value);
  };

  switch (command) {
    case "getAPIInfo":
      return 'tell application "DesktopRenamer" to get api information';
    case "getAPIVersion":
      return 'tell application "DesktopRenamer" to get api version';
    case "getSpaceSnapshot":
      return `
        tell application "DesktopRenamer"
          set allSpaces to get all spaces
          set currentName to get current space name
          set currentId to get current space id
          return allSpaces & "~~~" & currentName & "~~~" & currentId
        end tell
      `;
    case "getCurrentSpaceName":
      return 'tell application "DesktopRenamer" to get current space name';
    case "getCurrentSpaceID":
      return 'tell application "DesktopRenamer" to get current space id';
    case "getAllSpaces":
      return 'tell application "DesktopRenamer" to get all spaces';
    case "getWindows":
      return 'tell application "DesktopRenamer" to get windows';
    case "switchToSpace":
      return `tell application "DesktopRenamer" to switch to space "${stringValue("spaceID")}"`;
    case "toggleLockSpace":
      return `tell application "DesktopRenamer" to toggle lock space "${stringValue("spaceID")}"`;
    case "restoreMovedWindows":
      return 'tell application "DesktopRenamer" to restore moved windows';
    case "renameCurrentSpace":
      return `tell application "DesktopRenamer" to rename current space "${stringValue("name")}"`;
    case "renameSpace":
      return `tell application "DesktopRenamer" to rename space "${stringValue("spaceID")}" to "${stringValue("name")}"`;
    case "rearrangeSpace":
      return `tell application "DesktopRenamer" to rearrange space "${stringValue("spaceID")}" direction "${stringValue("direction")}"`;
    case "moveWindowNext":
      return 'tell application "DesktopRenamer" to move window next';
    case "moveWindowPrevious":
      return 'tell application "DesktopRenamer" to move window previous';
    case "moveWindowToSpace":
      return `tell application "DesktopRenamer" to move window to space "${stringValue("spaceID")}"`;
    case "reloadSpaceLabels":
      return 'tell application "DesktopRenamer" to reload space labels';
    case "toggleMenubar":
      return 'tell application "DesktopRenamer" to toggle menubar';
    case "toggleLauncher":
      return 'tell application "DesktopRenamer" to toggle launcher';
    case "toggleLabels":
      return 'tell application "DesktopRenamer" to toggle labels';
    case "toggleActiveLabel":
      return 'tell application "DesktopRenamer" to toggle active label';
    case "togglePreviewLabel":
      return 'tell application "DesktopRenamer" to toggle preview label';
    case "toggleDesktopVisibility":
      return 'tell application "DesktopRenamer" to toggle desktop visibility';
    case "focusWindow":
      return `tell application "DesktopRenamer" to focus window ${integerValue("windowID")} pid ${integerValue("pid")}`;
    case "executeWindowAction":
      return `tell application "DesktopRenamer" to execute window action "${integerValue("windowID")}" pid "${integerValue("pid")}" action "${stringValue("action")}"`;
    case "moveSpecificWindow": {
      const pid = arguments_.pid === undefined ? "" : ` pid "${integerValue("pid")}"`;
      return `tell application "DesktopRenamer" to move specific window "${integerValue("windowID")}"${pid} from space "${stringValue("fromSpaceID")}" to space "${stringValue("targetSpaceID")}"`;
    }
  }
}
