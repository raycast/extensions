import { showHUD } from "@raycast/api";
import { setMute } from "./lib/cli";
import { handleCLIError } from "./components/error-handler";

export default async function Command() {
  try {
    const muted = await setMute("toggle");
    await showHUD(muted ? "🔇 Muted" : "🔊 Unmuted");
  } catch (error) {
    await handleCLIError(error);
  }
}
