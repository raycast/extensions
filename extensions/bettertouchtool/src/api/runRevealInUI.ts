import { runAppleScript } from "@raycast/utils";
import { getPreferenceValues } from "@raycast/api";
import { getRevealInUIAppleScript } from "../helpers";
import { Result } from "../types";

export async function runRevealInUI(uuid: string): Promise<Result<void>> {
  const osaCommand = getRevealInUIAppleScript(uuid);

  try {
    await runAppleScript(osaCommand);
    return { status: "success" };
  } catch (error) {
    if (error instanceof Error && error.message.includes("but found identifier")) {
      const prefs = getPreferenceValues();
      if (prefs.bttSharedSecret) {
        return {
          status: "error",
          error: "BTT currently does not support opening the UI for named triggers when a shared secret is set.",
        };
      }
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return {
      status: "error",
      error: errorMessage,
    };
  }
}
