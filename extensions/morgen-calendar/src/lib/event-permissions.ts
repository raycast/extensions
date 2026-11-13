import type { Calendar, Event } from "../types";

export function canModifyEvent(calendar: Calendar | undefined, event: Event): boolean {
  if (!calendar || calendar.accountId !== event.accountId || calendar.id !== event.calendarId) return false;
  if (calendar.myRights?.mayWriteAll) return true;
  if (!calendar.myRights?.mayWriteOwn || !event.participants) return false;

  // mayWriteOwn applies only to events owned by this account or events with no owner.
  // mayDelete is the right to delete the calendar itself, not an individual event.
  const owners = Object.values(event.participants).filter((participant) => participant.roles?.owner);
  return owners.length === 0 || owners.some((participant) => participant.accountOwner);
}
