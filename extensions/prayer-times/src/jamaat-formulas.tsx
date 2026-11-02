import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { loadSettings, Settings } from "./lib/settings";
import { getDaySchedule } from "./lib/prayers";
import { formatTime, ltrName } from "./lib/format";

/** The phone's formula guide (formula_docs.dart): names, functions, operators and examples. */
const NAMES: [string, string][] = [
  ["start", "This prayer's start"],
  ["end", "This prayer's end"],
  ["preferred_end", "Its preferred end (the end itself where the school has none)"],
  ["sunrise  sunset  midnight", "Sunrise, sunset and midnight"],
  ["latest_start_week", "This prayer's latest start this week, from Saturday (for weekly rules)"],
  ["weekday", "Day of the week, Monday 1 to Sunday 7"],
  ["is_friday", "1 on Friday, otherwise 0"],
  ["day  month", "Day of the month and month number"],
  ["fajr_start  asr_end  ...", "Each prayer's start and end, for example asr_start, isha_end"],
  ["dhuhr_jamaat  ...", "An earlier prayer's jamaat: fajr_jamaat, dhuhr_jamaat, asr_jamaat, maghrib_jamaat"],
];

const FUNCTIONS: [string, string][] = [
  [
    "ceil(x, step)  floor(x, step)  round(x, step)",
    "Round up, down or to the nearest multiple of step (1 if left out)",
  ],
  [
    "min(a, b)  max(a, b)  abs(x)  clamp(x, low, high)",
    "The smallest, the largest, the size of x, and x kept between low and high",
  ],
  ["at(hour, minute)", "A clock time as minutes: at(13, 30) is 810"],
];

const OPERATORS: [string, string][] = [
  [
    "+  -  *  /  //  %  **",
    "Add, subtract, multiply, divide; // divides and rounds down; % is the remainder; ** is the power",
  ],
  ["==  !=  <  <=  >  >=  and  or  not", "Compare, and combine conditions"],
  ["a if condition else b", "One value or another, as in Python"],
];

const EXAMPLES: [string, string][] = [
  ["ceil(start, 15) + 15", "Round the start up to 15 minutes, then add 15 (Asr, Isha)"],
  ["floor(end - 60, 5)", "An hour before the end, rounded down to 5 (Fajr)"],
  ["maghrib_jamaat + 10", "Isha 10 minutes after Maghrib's jamaat"],
  ["at(13, 30) if is_friday else ceil(start, 15) + 15", "A fixed time on Fridays, a rounded one on other days"],
  ["floor(latest_start_week, 5) + 10", "Weekly: the week's latest start rounded down to 5, plus 10"],
];

const table = (rows: [string, string][]) =>
  ["| | |", "| --- | --- |", ...rows.map(([code, meaning]) => `| \`${code}\` | ${meaning} |`)].join("\n");

/** Each prayer's rule today, and its jamaat or why a formula gives none. */
function todayTable(settings: Settings): string {
  const { schedule } = settings;
  const rows = getDaySchedule(new Date(), schedule).map((slot) => {
    const rule = (
      slot.jumuah && schedule.jamaatJumuah.trim() ? schedule.jamaatJumuah : schedule.jamaat[slot.key]
    ).trim();
    const jamaat = slot.jamaat ? formatTime(slot.jamaat) : slot.jamaatError ? `⚠ ${slot.jamaatError}` : "None";
    return `| ${ltrName(slot.name)} | ${rule ? `\`${rule}\`` : "None"} | ${formatTime(slot.start)} | ${jamaat} |`;
  });
  return ["| Prayer | Rule | Starts | Jamaat |", "| --- | --- | --- | --- |", ...rows].join("\n");
}

export default function Command() {
  // Settings are only for the "Today" table; the guide shows without them (e.g. before a location is set).
  const { data: settings, isLoading } = usePromise(() => loadSettings().catch(() => undefined));
  const markdown = [
    "# Jamaat Formula Guide",
    "Type a formula into a prayer's Jamaat setting to work out its jamaat time, in a small Python-like language " +
      "(the same as the phone app's). Times are minutes after midnight, so 13:30 is 810; write `at(13, 30)` for a " +
      "clock time. The short rules (`13:30`, `+10`, `floor5+15`, `end-30`, `dhuhr+10`) still work as before.",
    ...(settings ? ["## Today", todayTable(settings)] : []),
    "## Names",
    table(NAMES),
    "## Functions",
    table(FUNCTIONS),
    "## Operators",
    table(OPERATORS),
    "## Examples",
    table(EXAMPLES),
    "A formula never gives a time before the adhan, and a time at or after the prayer's end gives no jamaat. " +
      "A formula that fails gives no jamaat time; the menu bar and the table above say why.",
  ].join("\n\n");

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Open Jamaat Settings" icon={Icon.Gear} onAction={openExtensionPreferences} />
          <ActionPanel.Section title="Copy Example">
            {EXAMPLES.map(([code]) => (
              <Action.CopyToClipboard key={code} title={code} content={code} />
            ))}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
