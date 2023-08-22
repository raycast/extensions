import { LaunchProps, closeMainWindow } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default async function Command(props: LaunchProps) {
  const { domain } = props.arguments;

  await runAppleScript(`
  tell application "Terminal"
    activate
    do script with command "ping -c 3 ${domain}"
  end tell
  `);

  closeMainWindow();
}
