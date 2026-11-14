import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const menuBarPath = path.join(root, "src", "menu-bar.tsx");
const source = fs.readFileSync(menuBarPath, "utf8");

const checks = [];

function check(name, condition, detail) {
  checks.push({ name, condition, detail });
}

check(
  "End-of-day wording describes the filtered view",
  source.includes('"Nothing else shown today"'),
  'Smart Status says "Nothing else shown today" instead of claiming there are no events anywhere.',
);

check(
  "End-of-day wording is mode-neutral",
  !source.includes('"No more meetings shown today"') &&
    !source.includes('"No more events shown today"') &&
    !source.includes('"No more meetings today"') &&
    !source.includes('"No more events today"'),
  "Meetings Only and Show All Events use the same truthful end-of-day wording.",
);

check(
  "Long-gap wording identifies the next visible item",
  source.includes('`Next meeting at ${clockLabel(start)}`') &&
    source.includes('`Next event at ${clockLabel(start)}`'),
  'Long gaps say "Next meeting at …" or "Next event at …".',
);

check(
  "Long-gap wording respects the meeting filter",
  !source.includes('`Nothing shown until ${clockLabel(start)}`') &&
    !source.includes('`No meetings until ${clockLabel(start)}`') &&
    !source.includes('`No events until ${clockLabel(start)}`') &&
    !source.includes('`Free until ${clockLabel(start)}`'),
  "Smart Status no longer uses the older ambiguous long-gap wording.",
);

check(
  "Legacy absolute/asymmetric wording removed",
  !source.includes("No meetings for the rest of today") &&
    !source.includes("Free for the rest of today") &&
    !source.includes("No more meetings today") &&
    !source.includes("No more events today"),
  "Older wording that implied knowledge of every Google Calendar event is no longer present.",
);

check(
  "Current-event countdown preserved",
  source.includes(
    '`${truncate(eventTitle(item))} · ${compactDuration(minutesLeft)} left`',
  ),
  "Active events still show their remaining time.",
);

check(
  "Near-event countdown preserved",
  source.includes(
    '`${truncate(eventTitle(item))} · in ${compactDuration(minutesUntil)}`',
  ),
  "Upcoming events within the threshold still show an in-X countdown.",
);

check(
  "All-day headline preserved",
  source.includes('`${truncate(eventTitle(item))} · All day`'),
  "All-day Smart Status behaviour remains unchanged.",
);

check(
  "Multi-day all-day events count as active today",
  source.includes("function allDaySpansLocalDay(") &&
    source.includes("eventStartMillis(item) < nextDay.getTime()") &&
    source.includes("eventEndMillis(item) > dayStart.getTime()"),
  "Google's exclusive all-day end date is respected when deciding whether an event spans today.",
);

check(
  "Multi-day all-day date labels hide the original start date while active",
  source.includes("sameLocalDay(start, now) || allDaySpansLocalDay(item, now)") &&
    source.includes("return allDaySpansLocalDay(item, now)"),
  "An all-day event that began yesterday is presented as active today instead of being labelled with yesterday's date.",
);

console.log("\nDayCal Smart Status contract\n");

let failed = 0;

for (const item of checks) {
  if (item.condition) {
    console.log(`✅ ${item.name}`);
    console.log(`   ${item.detail}`);
  } else {
    failed += 1;
    console.log(`❌ ${item.name}`);
    console.log(`   ${item.detail}`);
  }
}

console.log(`\n${checks.length - failed}/${checks.length} Smart Status checks passed`);

if (failed > 0) {
  process.exit(1);
}
