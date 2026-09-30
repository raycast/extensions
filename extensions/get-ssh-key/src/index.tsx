import { showHUD, launchCommand, LaunchType, Clipboard } from "@raycast/api";
import { getSSHKeys } from "./util";

export default async function Command() {
  try {
    const files = await getSSHKeys();

    if (files.length === 0) {
      await showHUD("❌ No ssh keys found");
    } else if (files.length === 1) {
      await Clipboard.copy(files[0].readFile());
      await showHUD("✅ Copied ssh key to clipboard");
    } else {
      await launchCommand({ name: "list", type: LaunchType.UserInitiated });
    }
  } catch (error) {
    if (error instanceof Error) {
      await showHUD(error.message);
    }
  }
}
