import { getFrontmostApplication, getPreferenceValues } from "@raycast/api";
import { Preferences } from "../types/preferences";
import { App } from "../types/type";

export const appsWithBundle: string[] = [
  "com.apple.Preview",
  "com.apple.TextEdit",
  "com.apple.MobileSMS",
  "com.apple.Terminal",
  "com.apple.QuickTimePlayerX",
  "com.apple.Notes",
  "com.apple.shortcuts",
  "com.apple.TV",
  "com.apple.Mail",
];

export async function getAllApps() {
  const { notes, preview, textEdit, terminal, quickTimePlayer, shortcuts, tv, messages, mail } =
    getPreferenceValues<Preferences>();

  const activeAppName = (await getFrontmostApplication()).name;

  const apps: App[] = [
    {
      name: "Preview",
      windows: "0",
      enabled: preview,
      isActive: activeAppName === "Preview",
      path: "/System/Applications/Preview.app",
      bundleProcessName: "com.apple.Preview",
    },
    {
      name: "TextEdit",
      windows: "0",
      enabled: textEdit,
      isActive: activeAppName === "TextEdit",
      path: "/System/Applications/TextEdit.app",
      bundleProcessName: "com.apple.TextEdit",
    },
    {
      name: "Messages",
      windows: "0",
      enabled: messages,
      isActive: activeAppName === "Messages",
      path: "/System/Applications/Messages.app",
      bundleProcessName: "com.apple.MobileSMS",
    },
    {
      name: "Terminal",
      windows: "0",
      enabled: terminal,
      isActive: activeAppName === "Terminal",
      path: "/System/Applications/Utilities/Terminal.app",
      bundleProcessName: "com.apple.Terminal",
    },
    {
      name: "QuickTime Player",
      windows: "0",
      enabled: quickTimePlayer,
      isActive: activeAppName === "QuickTime Player",
      path: "/System/Applications/QuickTime Player.app",
      bundleProcessName: "com.apple.QuickTimePlayerX",
    },
    {
      name: "Notes",
      windows: "1",
      enabled: notes,
      isActive: activeAppName === "Notes",
      path: "/System/Applications/Notes.app",
      bundleProcessName: "com.apple.Notes",
    },
    {
      name: "Shortcuts",
      windows: "1",
      enabled: shortcuts,
      isActive: activeAppName === "Shortcuts",
      path: "/System/Applications/Shortcuts.app",
      bundleProcessName: "com.apple.shortcuts",
    },
    {
      name: "TV",
      windows: "1",
      enabled: tv,
      isActive: activeAppName === "TV",
      path: "/System/Applications/TV.app",
      bundleProcessName: "com.apple.TV",
    },
    {
      name: "Mail",
      windows: "0",
      enabled: mail,
      isActive: activeAppName === "Mail",
      path: "/System/Applications/Mail.app",
      bundleProcessName: "com.apple.Mail",
    },
  ];
  return apps;
}
