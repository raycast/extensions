import { LaunchProps, popToRoot, closeMainWindow, showHUD } from "@raycast/api";
import { openGoogleChrome } from "./util/util";

export default async function Command(props: LaunchProps) {
  const profileDirectory = props.launchContext?.directory;
  const url = props.launchContext?.url || "";

  if (profileDirectory) {
    await openGoogleChrome(profileDirectory, url, async () => {
      await showHUD("Opening bookmark...");
    });
    await popToRoot();
    await closeMainWindow();
  }

  return null;
}
