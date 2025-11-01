import { runAppleScript } from "@raycast/utils";
import { CLICK_TYPE_DISPLAY_NAME } from "../constants";
import { ActionType, Result } from "../types";
import { createResultFromAppleScriptError, getTellApplication } from "./utils";

function buildAppleScript(menuBarId: string, actionType: ActionType): string {
  const prefix = `${getTellApplication()} to`;
  const id = JSON.stringify(menuBarId);

  if (actionType === "activate") {
    return `${prefix} activate ${id}`;
  }

  if (actionType === "show") {
    return `${prefix} show ${id}`;
  }

  let clickCommand = "";
  switch (actionType) {
    case "left":
      clickCommand = "left click";
      break;
    case "right":
      clickCommand = "right click";
      break;
    case "optLeft":
      clickCommand = "option left click";
      break;
    case "optRight":
      clickCommand = "option right click";
      break;
    default:
      return actionType satisfies never;
  }
  return `${prefix} show ${id} and ${clickCommand}`;
}

export async function performMenuBarAction(menuBarId: string, actionType: ActionType): Promise<Result<void>> {
  try {
    const script = buildAppleScript(menuBarId, actionType);
    await runAppleScript(script);
    return { status: "success" };
  } catch (error) {
    return createResultFromAppleScriptError(error, `Failed to ${CLICK_TYPE_DISPLAY_NAME[actionType]} menu bar item`);
  }
}
