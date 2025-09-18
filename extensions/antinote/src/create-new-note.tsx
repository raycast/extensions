import { closeMainWindow, getSelectedText, LaunchProps } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";
import { checkAntinoteInstalled } from "./utils";

export default async function Command(props: LaunchProps<{ arguments: { content: string } }>) {
  const isInstalled = await checkAntinoteInstalled();

  if (!isInstalled) {
    return;
  }

  let content = props.arguments.content;
  if (!content) {
    try {
      content = await getSelectedText();
    } catch (error) {
      // ignore
      content = "";
    }
  }

  // Encode the content for URL
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
