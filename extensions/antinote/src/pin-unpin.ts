import { closeMainWindow } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";
import { checkAntinoteInstalled } from "./utils";

export default async function main() {
  const isInstalled = await checkAntinoteInstalled();

  if (!isInstalled) {
    return;
  }

  try {
    await runAppleScript(`
      tell application "Antinote"
        activate
        delay 0.3
        open location "antinote://x-callback-url/togglePin"
      end tell
    `);

    await closeMainWindow({ clearRootSearch: true });
  } catch (error) {
    await showFailureToast(error, { title: "Failed to pin / unpin Antinote window" });
  }
}
