import { LocalStorage } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export default async function interval() {
  const text = await LocalStorage.getItem("selected");
  const selected = text ? JSON.parse(text as string) : [];

  const runningApps = (
    await runAppleScript(`
      tell application "System Events"
          return bundle identifier of every application process whose background only is false
      end tell
    `)
  ).split(", ");

  for (const app of selected) {
    if (!runningApps.includes(app)) {
      await runAppleScript(`
        tell application id "${app}"
            activate
            hide
        end tell
      `);
    }
  }
}
