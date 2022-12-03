import { getFrontmostApplication, showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { Focus, showFocus } from "./utils";

async function getAppFocus(): Promise<Focus | undefined> {
  const application = await getFrontmostApplication();

  switch (application.bundleId) {
    case "com.culturedcode.ThingsMac":
      return {
        icon: "task",
        text: await runAppleScript(`
          tell application "Things3"
            repeat with selectedToDo in selected to dos
              return name of selectedToDo
            end repeat
          end tell
        `),
      };
    case "com.apple.mail":
      return {
        icon: "email",
        text: await runAppleScript(`
          tell application "Mail"
            if not (get selection) is {} then
              set theMsg to item 1 of (get selection)
            else
              return
            end if
            
            tell theMsg
              set theSubject to its subject
              return theSubject
            end tell
          end tell     
        `),
      };
    case "com.apple.Safari":
      return {
        icon: "browser",
        text: await runAppleScript(`tell application "Safari" to return name of front document`),
      };
    case "com.google.Chrome":
      return {
        icon: "browser",
        text: await runAppleScript(`tell application "Google Chrome" to return title of active tab of front window`),
      };
    case "com.brave.Browser":
      return {
        icon: "browser",
        text: await runAppleScript(`tell application "Brave Browser" to return title of active tab of front window`),
      };
    case "company.thebrowser.Browser":
      return {
        icon: "browser",
        text: await runAppleScript(`tell application "Arc" to return title of active tab of front window`),
      };
    default:
      await showHUD("❌ Unsupported App");
  }
}

export default async function applicationFocus() {
  const focus = await getAppFocus();
  if (focus) {
    return showFocus(focus);
  }
}
