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
  {
    title: "Working remotely",
    emojiCode: ":house_with_garden:",
    defaultDuration: 0,
  },
  {
    title: "Working from office",
    emojiCode: ":office:",
    defaultDuration: 0,
  },
];
