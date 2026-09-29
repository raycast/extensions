import { LocalStorage } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { addDaysISO, clockPart, datePart } from "./format";
import { eventRange, isBlockingKind, isTailRow, nowWallClock, ScheduleDay, ScheduleResponse } from "./schedule-model";

// Block-transition notifications (the retention feature). The menu-bar command
// re-renders only on its ~10-min tick, so we notify slightly ahead. Each block
// can fire two pings in non-overlapping lead bands: a "lead" heads-up first,
// then a "start" ping. Dedup by id + boundary so each band fires once.
// RQ-notify: verify reliability and feel with a live account.

// Must equal the `now` command "interval" in package.json. tests/notify.test.ts checks it.
export const TICK_MINUTES = 10;
// The heads-up band must be at least one tick wide, or a block jumps over it
// between ticks and the heads-up never fires. So it spans the whole tick before
// the start band.
const LEAD_MINUTES = TICK_MINUTES;

type Boundary = "lead" | "start";

/** The lead band a block's lead time falls in, or null when it is out of range. */
function boundaryFor(lead: number): Boundary | null {
  if (lead >= 0 && lead <= TICK_MINUTES) return "start";
  if (lead > TICK_MINUTES && lead <= TICK_MINUTES + LEAD_MINUTES) return "lead";
  return null;
}

/** Fire a system notification for each block that enters a lead band. */
export async function maybeNotifyTransitions(schedule: ScheduleResponse): Promise<void> {
  const { date: todayIso, minutes: nowMinutes } = nowWallClock(schedule.now);
  // A block whose start falls in account [00:00, 00:10] has its whole lead band
  // (start − 20, start − 10] before account midnight, on the *previous* account
  // day's tick. The block lives on account-tomorrow's `days[]` entry then, so we
  // must walk account-tomorrow alongside account-today to reach its lead window.
  const daysToCheck = [
    schedule.days.find((d) => d.date === todayIso),
    schedule.days.find((d) => d.date === addDaysISO(todayIso, 1)),
  ].filter((d): d is ScheduleDay => Boolean(d));

  // Read the dedup snapshot once; reuse it for the check and the prune.
  const stored = await LocalStorage.allItems<Record<string, string>>();

  for (const day of daysToCheck) {
    for (const event of day.events ?? []) {
      // A tail row (start on an earlier day than the one it is listed under) is
      // not a real start here — it is processed on its own home day. Reference
      // `day.date`, not `todayIso`: a block that spans midnight also sits as a
      // tail row on account-tomorrow's entry, and the dedup snapshot is read
      // once per tick, so filtering by `todayIso` would let it fire twice here.
      if (isTailRow(event, day.date)) continue;
      // Do not ping for non-blocking or reference blocks — they are not real starts.
      if (!isBlockingKind(event)) continue;
      // Keep the start minute on account-today's axis. Re-basing to `day.date`
      // would put an early-morning block back on its own day and miss the lead
      // band during the pre-midnight tick (the band sits before account midnight).
      const range = eventRange(event, todayIso);
      if (!range) continue;
      const boundary = boundaryFor(range.start - nowMinutes);
      if (!boundary) continue;

      // Key the dedup by the block's own date, not today's. A 00:03 block's start
      // band spans account midnight, so a today key would let it fire twice.
      const start = clockPart(event.start);
      const key = notifyKey(datePart(event.start), event.id, start, boundary);
      if (stored[key]) continue;

      await fireNotification(event.name || "A block", start, boundary);
      await LocalStorage.setItem(key, "1");
    }
  }

  // Drop dedup keys from earlier days so LocalStorage does not grow forever.
  // Keep account-tomorrow's keys: they guard its bands after midnight. The date
  // sits at a fixed position, and ISO dates compare correctly as strings.
  const prefix = "notified:";
  for (const key of Object.keys(stored)) {
    if (key.startsWith(prefix) && key.slice(prefix.length, prefix.length + todayIso.length) < todayIso) {
      await LocalStorage.removeItem(key);
    }
  }
}

function notifyKey(date: string, id: string, start: string, boundary: Boundary): string {
  return `notified:${date}:${id}:${start}:${boundary}`;
}

async function fireNotification(name: string, start: string, boundary: Boundary): Promise<void> {
  const body = boundary === "lead" ? `Coming up at ${start}` : `Starts at ${start}`;
  // Escape quotes and backslashes, and flatten newlines. A raw newline breaks
  // the AppleScript string literal and drops the notification.
  const safeName = name.replace(/["\\]/g, "'").replace(/[\r\n]+/g, " ");
  const script = `display notification "${body}" with title "Reassign" subtitle "${safeName}"`;
  try {
    await runAppleScript(script);
  } catch {
    // A failed notification must never break the menu-bar render.
  }
}
