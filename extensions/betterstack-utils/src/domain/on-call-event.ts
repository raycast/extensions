import { isDateInInterval, today } from "@/common/utils/date-utils";
import { formatUserName, User } from "@/domain/user";
import { mergeIntervals, subtractIntervals } from "@/domain/time-interval";
import { getColor } from "@/common/colors";
import { Optional } from "@/common/utils/optional-utils";

export interface OnCallEvent {
  user: User;
  startedAt: string;
  endedAt: string;
  override: boolean;
}

export function getOnCallUser(events: OnCallEvent[]) {
  const currentOnCall = getCurrentOnCallUser(events);
  const onCallUserName = currentOnCall ? formatUserName(currentOnCall) : undefined;

  return onCallUserName ? { name: onCallUserName, color: getColor(onCallUserName) } : undefined;
}

export function resolveOverrideConflicts(events: OnCallEvent[]): OnCallEvent[] {
  const overrideEvents = events.filter((event) => event.override);
  const regularEvents = events.filter((event) => !event.override);
  if (overrideEvents.length === 0) return events;

  const overrideIntervals = mergeIntervals(
    overrideEvents.map((event) => ({
      start: new Date(event.startedAt).getTime(),
      end: new Date(event.endedAt).getTime(),
    })),
  );

  const regularEventFragments = regularEvents.flatMap((event) => {
    const interval = { start: new Date(event.startedAt).getTime(), end: new Date(event.endedAt).getTime() };
    return subtractIntervals(interval, overrideIntervals).map((fragment) => ({
      ...event,
      startedAt: new Date(fragment.start).toISOString(),
      endedAt: new Date(fragment.end).toISOString(),
    }));
  });

  return [...overrideEvents, ...regularEventFragments];
}

function getCurrentOnCallUser(events: OnCallEvent[]): Optional<User> {
  const active = events.filter((event) =>
    isDateInInterval(today(), new Date(event.startedAt), new Date(event.endedAt)),
  );
  const override = active.find((event) => event.override);
  if (override) return override.user;

  return active[0]?.user;
}
