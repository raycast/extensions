import { Toast, closeMainWindow, open } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { checkReflect, reflectDownload } from "./helpers/reflect";

export default async () => {
  const reflectInstalled = await checkReflect();
  if (!reflectInstalled) {
    const toast = new Toast({
      title: "Reflect not found",
      style: Toast.Style.Failure,
    });

    toast.show();
    toast.message = "Press ⌘ + D to download";
    toast.primaryAction = {
      title: "Download",
      shortcut: {
        modifiers: ["cmd"],
        key: "d",
      },
      onAction: async () => await open(reflectDownload),
    };
    return false;
  }

  await closeMainWindow();
  await runAppleScript(`
    tell application "Reflect" to activate
    tell application "System Events" to tell process "Reflect" to ¬
    click menu item "New Note" of menu "File" of menu bar 1
  `);
};
