import { showHUD } from "@raycast/api";
import { togglePanel } from "./lib/cli";
import { handleCLIError } from "./components/error-handler";

export default async function Command() {
  try {
    await togglePanel();
    await showHUD("📋 Panel Toggled");
  } catch (error) {
    await handleCLIError(error);
  }
}
