import { LaunchType, launchCommand, showHUD } from "@raycast/api";
import { errorMessage, toggleAerospace } from "./utils/aerospace";

export default async function Command() {
  try {
    const result = await toggleAerospace();
    await showHUD(result.stdout || result.stderr || "AeroSpace status updated");
    await launchCommand({
      name: "aerospace-menu-bar",
      type: LaunchType.Background,
    }).catch(() => undefined);
  } catch (error) {
    await showHUD(`AeroSpace error: ${errorMessage(error)}`);
  }
}
