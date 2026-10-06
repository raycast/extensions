import { runAppleScript } from "@raycast/utils";
import { CLICK_TYPE_DISPLAY_NAME } from "../constants";
import { ActionType, Result } from "../types";
import { BartenderApp, createResultFromAppleScriptError, getBartenderApp } from "./utils";

// Bartender 7 takes the click type as a four-character code string. Its AppleScript dictionary spells
// "option right click" as "optionright click", so the codes are more reliable than the terminology.
const CLICK_TYPE_CODE = {
  left: "lclk",
  right: "rclk",
  optLeft: "locl",
  optRight: "rocl",
} as const;

// Bartender 5 and 6 use the terms from their dictionaries
const LEGACY_CLICK_TYPE_TERM = {
  left: "left click",
  right: "right click",
  optLeft: "option left click",
  optRight: "option right click",
} as const;

function buildAppleScript(app: BartenderApp, menuBarId: string, actionType: ActionType): string {
  const prefix = `tell application "${app.name}" to`;
  const id = JSON.stringify(menuBarId);

  if (actionType === "activate") {
    return `${prefix} activate ${id}`;
  }

  if (actionType === "show") {
    return `${prefix} show ${id}`;
  }

  const clickType = app.majorVersion >= 7 ? `"${CLICK_TYPE_CODE[actionType]}"` : LEGACY_CLICK_TYPE_TERM[actionType];
  return `${prefix} show ${id} and ${clickType}`;
}

export async function performMenuBarAction(menuBarId: string, actionType: ActionType): Promise<Result<void>> {
  try {
    const script = buildAppleScript(await getBartenderApp(), menuBarId, actionType);
    await runAppleScript(script);
    return { status: "success" };
  } catch (error) {
    return createResultFromAppleScriptError(error, `Failed to ${CLICK_TYPE_DISPLAY_NAME[actionType]} menu bar item`);
  }
}
