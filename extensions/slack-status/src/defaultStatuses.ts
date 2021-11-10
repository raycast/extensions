import { SlackStatusPreset } from "./interfaces";

export const defaultStatuses: SlackStatusPreset[] = [
  {
    title: "Focus Mode",
    emojiCode: ":technologist:",
    defaultDuration: 120,
  },
  {
    title: "In a Meeting",
    emojiCode: ":spiral_calendar_pad:",
    defaultDuration: 30,
  },
  {
    title: "Eating",
    emojiCode: ":hamburger:",
    defaultDuration: 60,
  },
  {
    title: "Coffee Break",
    emojiCode: ":coffee:",
    defaultDuration: 15,
  },
  {
    title: "AFK",
    emojiCode: ":walking:",
    defaultDuration: 0,
  },
];
