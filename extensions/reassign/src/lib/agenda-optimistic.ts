import type { WriteOp } from "./api";
import { addMinutesHM } from "./format";
import { eventRange, type ScheduleEvent } from "./schedule-model";

type OptimisticOp = Extract<WriteOp, { op: "reflect" | "delete" | "shift" }>;

/** Shared row updates for the day and week cache; revalidation supplies date changes. */
export function transformEvents(events: ScheduleEvent[], op: OptimisticOp): ScheduleEvent[] {
  if (op.op === "delete") return events.filter((event) => event.id !== op.id);
  return events.map((event) => {
    if (event.id !== op.id) return event;
    // Set both fields: reflectState reads `state` first, so a re-reflect of an
    // already-reflected block must overwrite `state`, not only `status`.
    if (op.op === "reflect") return { ...event, reflect: { ...event.reflect, state: op.status, status: op.status } };
    // Midnight shifts can change the date bucket and server-generated tail rows.
    // Keep the authoritative row until revalidation instead of shifting only its clocks.
    const range = eventRange(event);
    if (
      !range ||
      event.continuesFromPrevDay ||
      event.endsAtDayBoundary ||
      range.start < 0 ||
      range.end >= 24 * 60 ||
      range.start + op.byMinutes < 0 ||
      range.end + op.byMinutes >= 24 * 60
    )
      return event;
    return {
      ...event,
      start: addMinutesHM(event.start, op.byMinutes),
      end: addMinutesHM(event.end, op.byMinutes),
    };
  });
}
