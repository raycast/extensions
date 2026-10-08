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

function buildAppleScripts(app: BartenderApp, menuBarId: string, actionType: ActionType): string[] {
  const prefix = `tell application "${app.name}" to`;
  const id = JSON.stringify(menuBarId);

  if (actionType === "activate") {
    return [`${prefix} activate ${id}`];
  }

  if (actionType === "show") {
    return [`${prefix} show ${id}`];
  }

  const withCode = `${prefix} show ${id} and "${CLICK_TYPE_CODE[actionType]}"`;
  const withTerm = `${prefix} show ${id} and ${LEGACY_CLICK_TYPE_TERM[actionType]}`;

  if (app.majorVersion === undefined) {
    // Unknown version: try the older wording first, which Bartender 7 only rejects (at compile time) for option right click
    return [withTerm, withCode];
  }
  return [app.majorVersion >= 7 ? withCode : withTerm];
}

function isAppleScriptSyntaxError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("(-2740)");
}

export async function performMenuBarAction(menuBarId: string, actionType: ActionType): Promise<Result<void>> {
  try {
    const scripts = buildAppleScripts(await getBartenderApp(), menuBarId, actionType);
    for (const [index, script] of scripts.entries()) {
      try {
        await runAppleScript(script);
        break;
      } catch (error) {
        if (index === scripts.length - 1 || !isAppleScriptSyntaxError(error)) {
          throw error;
        }
      }
    }
    return { status: "success" };
  } catch (error) {
    return createResultFromAppleScriptError(error, `Failed to ${CLICK_TYPE_DISPLAY_NAME[actionType]} menu bar item`);
  }
}
