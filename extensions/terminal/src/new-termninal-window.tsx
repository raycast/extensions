import { runAppleScript } from "run-applescript";
import { popToRoot } from "@raycast/api";

export default async function Command() {
  const script = `
  tell application "Terminal"
    do script ""
    activate
  end tell`;

  await runAppleScript(script);
  await popToRoot();
}
