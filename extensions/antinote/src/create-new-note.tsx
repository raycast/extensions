import { closeMainWindow, LaunchProps } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";
import { checkAntinoteInstalled } from "./utils";

export default async function Command(props: LaunchProps<{ arguments: { content: string } }>) {
  const isInstalled = await checkAntinoteInstalled();

  if (!isInstalled) {
    return;
  }

  try {
    await runAppleScript(
      `tell application "Antinote"
        activate
        delay 0.3
        open location "antinote://x-callback-url/createNote?content=${props.arguments.content}"
      end tell`,
    );

    await closeMainWindow({ clearRootSearch: true });
  } catch (error) {
    await showFailureToast(error, { title: "Failed to create new note in Antinote" });
  }
}
