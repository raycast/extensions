import { CommandRecord } from "./types";

export const applicationShortcutRecordToggleMute: CommandRecord = {
  id: "1",
  name: "Toggle Mute/Unmute",
  shortcuts: [
    {
      type: "web",
      shortcutToRun: {
        key: "d",
        modifiers: ["command"],
      },
      websiteUrl: "https://meet.google.com/",
    },
    {
      type: "app",
      applicationName: "Slack",
      shortcutToRun: {
        key: " ",
        modifiers: ["command", "shift"],
      },
    },
    {
      type: "app",
      applicationName: "zoom.us",
      shortcutToRun: {
        key: "a",
        modifiers: ["command", "shift"],
      },
    },
  ],
  isPredefined: true,
};

export const applicationShortcutRaiseHandForMeet: CommandRecord = {
  id: "2",
  name: "Toggle Raise Hand",
  shortcuts: [
    {
      type: "web",
      shortcutToRun: {
        key: "h",
        modifiers: ["command", "control"],
      },
      websiteUrl: "https://meet.google.com/",
    },
    {
      type: "app",
      applicationName: "zoom.us",
      shortcutToRun: {
        key: "y",
        modifiers: ["option"],
      },
    },
  ],
  isPredefined: true,
};

export const idToCommandMap: Record<CommandRecord["id"], CommandRecord> = {
  1: applicationShortcutRecordToggleMute,
  2: applicationShortcutRaiseHandForMeet,
};
