import { calculate, format } from "./lib";
import { updateCommandMetadata } from "@raycast/api";

const emojis = ["🎁", "🍪", "❄️", "🎄", "🔔", "🎅", "☃️", "⛄", "🤶", "🦌"];

export default async function Command() {
  const now = new Date();

  const s = calculate({
    currDate: now,
    neededDate: new Date(now.getFullYear(), 11, 25),
  });
  const emoji = emojis[Math.floor(Math.random() * emojis.length)];

  let subtitle = "";

  if (s.isToday) {
    subtitle = `Merry Christmas! ${emoji}`;
  } else {
    subtitle = `${s.days ? `${format(s.days, "day")} and ` : ""}${s.hours ? format(s.hours, "hour") : ""
      } until Christmas ${emoji}`;
  }

  await updateCommandMetadata({ subtitle });
}
