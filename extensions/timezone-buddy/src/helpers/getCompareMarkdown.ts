import { TimezoneBuddy } from "../interfaces/TimezoneBuddy";
import { getHourForTz } from "./getHourForTz";
import { getRelativeOffsetMinutes } from "./getTzOffsetMinutes";
import { statusForHour } from "./getHourStatus";
import { hourLabel } from "./hourLabel";

/** Contiguous ranges of local hours (0-23) where a predicate holds. */
function contiguousRanges(hours: number[]): Array<[number, number]> {
  const sorted = [...hours].sort((a, b) => a - b);
  const ranges: Array<[number, number]> = [];
  for (const h of sorted) {
    const last = ranges[ranges.length - 1];
    if (last && h === last[1] + 1) {
      last[1] = h;
    } else {
      ranges.push([h, h]);
    }
  }
  return ranges;
}

/**
 * Render every buddy's day as a single aligned grid, worldtimebuddy-style.
 *
 * Columns are *your* local hours, midnight on the left through to the
 * following midnight on the right. Each buddy is one row of 24 coloured
 * blocks; because every row is the same-width emoji starting at column 0,
 * the rows line up column-for-column. A vertical column that is green for
 * everyone is a slot where the whole group is awake and working, so the
 * grid can be scanned top-to-bottom to find a meeting time at a glance.
 *
 * A marker row points at the current local hour, and the shared "everyone
 * is reachable" window is computed and printed in your own local time.
 */
export function getCompareMarkdown(buddies: TimezoneBuddy[], offsetHrs?: number): string {
  if (buddies.length === 0) {
    return "# Compare buddies\n\nAdd a buddy first, then come back to see everyone's day side by side.";
  }

  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const nowLocalHour = getHourForTz(localTz, offsetHrs);

  // Each buddy's whole-hour offset from you (offset-independent).
  const relHoursByBuddy = buddies.map((b) => Math.round(getRelativeOffsetMinutes(b.tz, offsetHrs) / 60));

  // Build one band per buddy across the 24 local hours, tracking which local
  // hours are good for everyone at once.
  const goodEverywhere: number[] = [];
  const rows: string[] = [];

  for (let i = 0; i < buddies.length; i++) {
    const rel = relHoursByBuddy[i];
    const blocks: string[] = [];
    for (let localHour = 0; localHour < 24; localHour++) {
      blocks.push(statusForHour((((localHour + rel) % 24) + 24) % 24).block);
    }
    const time = hourLabel((((nowLocalHour + rel) % 24) + 24) % 24);
    rows.push(`${blocks.join("")}  ${buddies[i].name} · ${time}`);
  }

  // Your own row, and the shared-reachable computation (you included).
  const youBlocks: string[] = [];
  for (let localHour = 0; localHour < 24; localHour++) {
    youBlocks.push(statusForHour(localHour).block);
    const everyoneGood =
      statusForHour(localHour).isGood &&
      relHoursByBuddy.every((rel) => statusForHour((((localHour + rel) % 24) + 24) % 24).isGood);
    if (everyoneGood) {
      goodEverywhere.push(localHour);
    }
  }
  const youRow = `${youBlocks.join("")}  You · ${hourLabel(nowLocalHour)}`;

  // Marker row: a blank block per column, a red triangle under "now".
  const marker = Array.from({ length: 24 }, (_, h) => (h === nowLocalHour ? "🔻" : "⬜")).join("");

  // Hour scale. A text scale can never stay aligned over the grid, because
  // Raycast renders emoji wider than any text character, so the labels drift
  // further right with every column. The only thing that lines up with an
  // emoji grid is more emoji, so we mark every third hour with the matching
  // clock-face emoji (🕛 = 12, 🕒 = 3, 🕕 = 6, 🕘 = 9) and leave the rest blank.
  // Position tells morning from afternoon: the left half of the row is a.m.
  const clockFaces = ["🕛", "🕐", "🕑", "🕒", "🕓", "🕔", "🕕", "🕖", "🕗", "🕘", "🕙", "🕚"];
  const scaleCells: string[] = Array.from({ length: 24 }, () => "⬜");
  for (let h = 0; h < 24; h += 3) {
    scaleCells[h] = clockFaces[h % 12];
  }
  const scale = scaleCells.join("");

  const overlap =
    goodEverywhere.length > 0
      ? contiguousRanges(goodEverywhere)
          .map(([start, end]) => `${hourLabel(start)} – ${hourLabel(end + 1)}`)
          .join(", ")
      : "no hour works for everyone — try the closest all-green column above";

  return [
    "# Compare all buddies",
    "",
    "Columns are **your local hours**, midnight → midnight (🕛🕒🕕🕘 mark 12/3/6/9, a.m. on the left half). Scan down a column: where it's green for everyone, the whole group is reachable.",
    "",
    "```",
    scale,
    `${marker}  now (${hourLabel(nowLocalHour)})`,
    youRow,
    ...rows,
    "```",
    "",
    "🟩 working · 🟨 fringe · 🟥 asleep",
    "",
    "---",
    "",
    `🟢 **Everyone reachable — your local time:** ${overlap}`,
  ].join("\n");
}
