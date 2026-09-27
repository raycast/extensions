import type { WriteOp } from "./api";
import { addMinutesLocal, datePart } from "./format";
import { eventRange, type ScheduleEvent } from "./schedule-model";

type OptimisticOp = Extract<WriteOp, { op: "reflect" | "delete" | "shift" }>;

/** Shared row updates for the day and week cache; revalidation supplies date changes. */
export function transformEvents(events: ScheduleEvent[], op: OptimisticOp): ScheduleEvent[] {
  if (op.op === "delete") return events.filter((event) => event.id !== op.id);
  return events.map((event) => {
    if (event.id !== op.id) return event;
    if (op.op === "reflect") return { ...event, reflect: { ...event.reflect, status: op.status } };
    // A shift across midnight can change the day bucket and the tail rows.
    // Keep the authoritative row until revalidation instead of a local guess.
    const range = eventRange(event);
    if (
      !range ||
      range.end >= 24 * 60 ||
      range.start + op.byMinutes < 0 ||
      range.end + op.byMinutes >= 24 * 60 ||
      datePart(event.start) !== datePart(event.end)
    )
      return event;
    return {
      ...event,
      start: addMinutesLocal(event.start, op.byMinutes),
      end: addMinutesLocal(event.end, op.byMinutes),
    };
  });
}
