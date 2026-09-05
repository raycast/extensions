import { showHUD } from "@raycast/api";
import { errorMessage, reloadAerospace } from "./utils/aerospace";

export default async function Command() {
  try {
    const result = await reloadAerospace();
    await showHUD(result.stdout || result.stderr || "Configuration reloaded");
  } catch (error) {
    await showHUD(`Reload failed: ${errorMessage(error)}`);
  }
}
