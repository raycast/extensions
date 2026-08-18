import { LocalStorage } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { eventRange, isBlockingKind, minutesFromClock, ScheduleResponse } from "./schedule-model";

// Block-transition notifications (the retention feature). The menu-bar command
// re-renders only on its ~10-min tick, so we notify slightly ahead. Each block
// can fire two pings in non-overlapping lead bands: a "lead" heads-up first,
// then a "start" ping. Dedup by id + boundary so each band fires once.
// RQ-notify: verify reliability and feel with a live account.

const TICK_MINUTES = 10;
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
  const nowMinutes = minutesFromClock(schedule.now.currentClock);
  if (nowMinutes === null) return;

  const todayIso = schedule.now.todayIso;
  const today = schedule.days.find((d) => d.date === todayIso) ?? schedule.days[0];
  const events = today?.events ?? [];

  // Read the dedup snapshot once; reuse it for the check and the prune.
  const stored = await LocalStorage.allItems<Record<string, string>>();

  for (const event of events) {
    // A next-day tail row starts at 00:00 but is not a real start. Skip it.
    if (event.continuesFromPrevDay) continue;
    // Do not ping for non-blocking or reference blocks — they are not real starts.
    if (!isBlockingKind(event)) continue;
    const range = eventRange(event);
    if (!range) continue;
    const boundary = boundaryFor(range.start - nowMinutes);
    if (!boundary) continue;

    // Key the dedup by today's date and the band, so each band fires once and
    // the date-prefix prune below stays unambiguous.
    const key = notifyKey(todayIso, event.id, event.start, boundary);
    if (stored[key]) continue;

    await fireNotification(event.name || "A block", event.start, boundary);
    await LocalStorage.setItem(key, "1");
  }

  // Drop dedup keys from earlier days so LocalStorage does not grow forever.
  // The date sits at a fixed position, so a prefix match is exact.
  const todayPrefix = `notified:${todayIso}:`;
  for (const key of Object.keys(stored)) {
    if (key.startsWith("notified:") && !key.startsWith(todayPrefix)) {
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
