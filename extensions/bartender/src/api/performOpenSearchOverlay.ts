import { runAppleScript } from "@raycast/utils";
import { Result } from "../types";
import { createResultFromAppleScriptError } from "./utils";

export async function performOpenSearchOverlay(): Promise<Result<void>> {
  try {
    const script = `tell application "Bartender" to quick search`;
    await runAppleScript(script);
    return { status: "success" };
  } catch (error) {
    return createResultFromAppleScriptError(error, "Failed to open Bartender search overlay");
  }
}
