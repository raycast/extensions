import { runAppleScript } from "@raycast/utils";
import { Result } from "../types";
import { createResultFromAppleScriptError, getTellApplication } from "./utils";

export async function fetchMenuBarIdsFromBartender(): Promise<Result<string[]>> {
  try {
    const script = `${getTellApplication()} to list menu bar items`;
    const result = await runAppleScript(script);
    return { status: "success", data: result.split("\n").filter((item) => item.trim().length > 0) };
  } catch (error) {
    return createResultFromAppleScriptError(error, "Failed to get menu bar items");
  }
}
