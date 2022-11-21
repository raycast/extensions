import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../types/preferences";
import { Apps } from "../types/type";
import { appIsActive } from "./applescript-utils";

export async function getAllApps() {
  const { notes, preview, textEdit, terminal, quickTimePlayer, shortcuts, tv, messages, mail } =
    getPreferenceValues<Preferences>();

  const activeAppName = await appIsActive();

  const apps: Apps[] = [
    {
      name: "Preview",
      windows: "0",
      enabled: preview,
      isActive: activeAppName === "Preview",
      path: "/System/Applications/Preview.app",
    },
    {
      name: "TextEdit",
      windows: "0",
      enabled: textEdit,
      isActive: activeAppName === "TextEdit",
      path: "/System/Applications/TextEdit.app",
    },
    {
      name: "Messages",
      windows: "0",
      enabled: messages,
      isActive: activeAppName === "Messages",
      path: "/System/Applications/Messages.app",
    },
    {
      name: "Terminal",
      windows: "0",
      enabled: terminal,
      isActive: activeAppName === "Terminal",
      path: "/System/Applications/Utilities/Terminal.app",
    },
    {
      name: "QuickTime Player",
      windows: "0",
      enabled: quickTimePlayer,
      isActive: activeAppName === "QuickTime Player",
      path: "/System/Applications/QuickTime Player.app",
    },
    {
      name: "Notes",
      windows: "1",
      enabled: notes,
      isActive: activeAppName === "Notes",
      path: "/System/Applications/Notes.app",
    },
    {
      name: "Shortcuts",
      windows: "1",
      enabled: shortcuts,
      isActive: activeAppName === "Shortcuts",
      path: "/System/Applications/Shortcuts.app",
    },
    {
      name: "TV",
      windows: "1",
      enabled: tv,
      isActive: activeAppName === "TV",
      path: "/System/Applications/TV.app",
    },
    {
      name: "Mail",
      windows: "0",
      enabled: mail,
      isActive: activeAppName === "Mail",
      path: "/System/Applications/Mail.app",
    },
  ];
  return apps;
}
