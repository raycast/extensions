import { showHUD } from "@raycast/api";
import { volumeDown } from "./lib/cli";
import { handleCLIError } from "./components/error-handler";

export default async function Command() {
  try {
    const vol = await volumeDown();
    await showHUD(`🔉 Volume: ${Math.round(vol)}%`);
  } catch (error) {
    await handleCLIError(error);
  }
}
