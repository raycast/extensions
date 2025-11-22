import { LaunchProps, popToRoot, closeMainWindow, showHUD } from "@raycast/api";
import { openGoogleChrome } from "./util/util";

export default async function Command(props: LaunchProps) {
  const profileDirectory = props.launchContext?.directory;

  if (profileDirectory) {
    await openGoogleChrome(profileDirectory, "", async () => {
      await showHUD("Opening profile...");
    });
    await popToRoot();
    await closeMainWindow();
  }

  return null;
}
