import { showHUD } from "@raycast/api";
import { volumeUp } from "./lib/cli";
import { handleCLIError } from "./components/error-handler";

export default async function Command() {
  try {
    const vol = await volumeUp();
    await showHUD(`🔊 Volume: ${Math.round(vol)}%`);
  } catch (error) {
    await handleCLIError(error);
  }
}
