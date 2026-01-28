import { runAppleScript } from "run-applescript";
import { closeMainWindow } from "@raycast/api";
import checkForInstallation from "./utilities/checkForInstallation";

export default async function Command() {
  const isInstalled = await checkForInstallation();
  if (!isInstalled) {
    return;
  }
  await runAppleScript(`
  tell application id "net.shinystone.OKJSON"
		show Scripts Panel
  end tell
`);
  await closeMainWindow({ clearRootSearch: true });
}
