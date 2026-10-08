import { showHUD, open } from "@raycast/api";
import { CLINotFoundError, AppNotRunningError } from "../lib/cli";

export async function handleCLIError(error: unknown): Promise<void> {
  if (error instanceof CLINotFoundError) {
    await showHUD(
      "❌ BetterAudio CLI not found — install it in BetterAudio Settings",
    );
    return;
  }

  if (error instanceof AppNotRunningError) {
    await showHUD("BetterAudio is not running");
    try {
      await open("/Applications/BetterAudio.app");
    } catch {
      // Ignore launch failures and still show the HUD error above.
    }
    return;
  }

  if (error instanceof Error) {
    await showHUD(error.message);
    return;
  }

  await showHUD("An unexpected error occurred");
}
