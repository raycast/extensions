import { runAppleScript } from "@raycast/utils";
import { Result } from "../types";
import { createResultFromAppleScriptError, getTellApplication } from "./utils";

export async function performOpenSearchOverlay(): Promise<Result<void>> {
  try {
    const script = `${getTellApplication()} to quick search`;
    await runAppleScript(script);
    return { status: "success" };
  } catch (error) {
    return createResultFromAppleScriptError(error, "Failed to open Bartender search overlay");
  }
}
