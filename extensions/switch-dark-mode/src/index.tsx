import { closeMainWindow } from "@raycast/api";
import { runAppleScript } from 'run-applescript';

export default async () => {
  await closeMainWindow();
  await runAppleScript('tell app "System Events" to tell appearance preferences to set dark mode to not dark mode');
}
