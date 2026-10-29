import { closeMainWindow, getSelectedText } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";
import { checkAntinoteInstalled } from "./utils";

export default async function Command() {
  const installation = await checkAntinoteInstalled();

  if (!installation.installed) {
    return;
  }

  let content = "";
  try {
    content = await getSelectedText();
  } catch (error) {
    await showFailureToast(error, { title: "No text selected" });
    return;
  }

  const encodedContent = encodeURIComponent(content);

  try {
    await runAppleScript(
      `tell application "Antinote"
        activate
        delay 0.3
        open location "antinote://x-callback-url/createNote?content=${encodedContent}"
      end tell`,
    );

    await closeMainWindow({ clearRootSearch: true });
  } catch (error) {
    await showFailureToast(error, { title: "Failed to create new note in Antinote" });
  }
}
