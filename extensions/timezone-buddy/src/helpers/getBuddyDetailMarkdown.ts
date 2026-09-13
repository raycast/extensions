import { TimezoneBuddy } from "../interfaces/TimezoneBuddy";
import { getHourForTz } from "./getHourForTz";
import { getRelativeOffsetMinutes } from "./getTzOffsetMinutes";
import { statusForHour } from "./getHourStatus";
import { formatZoneName } from "./formatZoneName";
import { hourLabel } from "./hourLabel";

/**
 * Render a worldtimebuddy-style coloured hour band for a buddy.
 *
 * The 24 hours of their day are drawn as coloured blocks split into four
 * 6-hour quarters (🟩 working · 🟨 fringe · 🟥 asleep), each quarter labelled
 * with its starting hour so the band stays readable without needing the emoji
 * to line up pixel-perfectly under a text scale.
 *
 * The current hour's block is lifted out and shown on its own line as the
 * "now" marker, and the good working hours are translated back into your own
 * local time so you can read a slot to reach out straight off.
 */
export function getBuddyDetailMarkdown(buddy: TimezoneBuddy, offsetHrs?: number): string {
  const buddyHour = getHourForTz(buddy.tz, offsetHrs);
  const relMinutes = getRelativeOffsetMinutes(buddy.tz, offsetHrs);
  const relHours = Math.round(relMinutes / 60);

  const goodLocalHours: number[] = [];
  const quarters: string[] = [];

  for (let q = 0; q < 4; q++) {
    const blocks: string[] = [];
    for (let i = 0; i < 6; i++) {
      const h = q * 6 + i;
      const status = statusForHour(h);
      blocks.push(status.block);
      if (status.isGood) {
        // The local hour that lines up with this good hour for the buddy.
        goodLocalHours.push((((h - relHours) % 24) + 24) % 24);
      }
    }
    quarters.push(`\`${hourLabel(q * 6).padStart(3, " ")}\` ${blocks.join("")}`);
  }

  const nowStatus = statusForHour(buddyHour);
  const overlap =
    goodLocalHours.length > 0
      ? `${hourLabel(Math.min(...goodLocalHours))} – ${hourLabel(Math.max(...goodLocalHours) + 1)}`
      : "no daytime overlap";

  return [
    `# ${buddy.name}`,
    "",
    `**${formatZoneName(buddy.tz)}**`,
    "",
    `${nowStatus.block} **Right now:** ${hourLabel(buddyHour)} — ${nowStatus.label.toLowerCase()}`,
    "",
    "Their day, hour by hour:",
    "",
    ...quarters,
    "",
    "🟩 working · 🟨 fringe · 🟥 asleep",
    "",
    "---",
    "",
    `🟢 **Good time to reach out — in your local time:** ${overlap}`,
  ].join("\n");
}
