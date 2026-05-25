import { showHUD } from "@raycast/api";
import { toggleSilentMode } from "./lib/cli";
import { handleCLIError } from "./components/error-handler";

export default async function Command() {
  try {
    const silent = await toggleSilentMode();
    await showHUD(silent ? "🤫 Silent Mode: On" : "🔊 Silent Mode: Off");
  } catch (error) {
    await handleCLIError(error);
  }
}
