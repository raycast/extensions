import { runAppleScript } from "@raycast/utils";
import { getAppleScriptForNamedTrigger } from "../helpers";
import { Result } from "../types";

export async function runNamedTriggerAppleScript(name: string): Promise<Result<void>> {
  const osaCommand = getAppleScriptForNamedTrigger(name);

  try {
    await runAppleScript(osaCommand);
    return { status: "success" };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { status: "error", error: errorMessage };
  }
}
