import { showHUD } from "@raycast/api";
import { mediaPlayPause } from "./lib/cli";
import { handleCLIError } from "./components/error-handler";

export default async function Command() {
  try {
    await mediaPlayPause();
    await showHUD("⏯ Play / Pause");
  } catch (error) {
    await handleCLIError(error);
  }
}
