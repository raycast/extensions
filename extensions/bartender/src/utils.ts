import { getApplications, showHUD, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { BARTENDER_APPLICATION_NAME, BARTENDER_DISPLAY_NAME, NOT_RUNNING } from "./constants";

/**
 * Builds AppleScript to ensure Bartender 4 is running and then wraps the passed command(s).
 *
 * @param command - The AppleScript command(s) to run after ensuring Spotify is running.
 * @returns Generated AppleScript.
 */
export function buildScriptCheckIsBartenderRunning(command: string): string {
  return `
    tell application "${BARTENDER_APPLICATION_NAME}"
        if not application "${BARTENDER_APPLICATION_NAME}" is running then
            return "${NOT_RUNNING}"
        else
            ${command}
        end if
    end tell`;
}

export async function CheckBartenderIsInstalled() {
  const app_objs = await getApplications();
  const apps = new Set(app_objs.map((a) => a.name));
  return apps.has(BARTENDER_APPLICATION_NAME);
}

export async function NoViewCommand(toast_message: string, finish_message: string, command: string) {
  if (!(await CheckBartenderIsInstalled())) {
    await showHUD(`❗ ${BARTENDER_DISPLAY_NAME} is not installed.`);
    return;
  }

  const toast_promise = showToast({
    title: toast_message,
    style: Toast.Style.Animated,
  });
  const script = buildScriptCheckIsBartenderRunning(command);
  const res = await runAppleScript(script);
  if (res === NOT_RUNNING) {
    await showHUD(`❗ ${BARTENDER_DISPLAY_NAME} is not running.`);
    return;
  }
  await showHUD(finish_message);
  const toast = await toast_promise;
  await toast.hide();
}

export enum ClickAction {
  LeftClick,
  RightClick,
}

export declare interface MenuBarItem {
  name: string;
  itemName: string;
  menuItemId: string;
}

export function ClickMenuBarItem(menuItem: MenuBarItem, click: ClickAction) {
  let clickStr: string;
  let clickedMsg: string;
  if (click === ClickAction.LeftClick) {
    clickStr = "left click";
    clickedMsg = "Left clicked";
  } else {
    clickStr = "right click";
    clickedMsg = "Right clicked";
  }
  const script = buildScriptCheckIsBartenderRunning(`activate "${menuItem.menuItemId}" with ${clickStr}`);
  runAppleScript(script).then((result) => {
    if (result === NOT_RUNNING) {
      showHUD(`❗ ${BARTENDER_DISPLAY_NAME} is not running.`);
    } else {
      showHUD(`✅ ${clickedMsg} ${menuItem.name}`);
    }
  });
}
