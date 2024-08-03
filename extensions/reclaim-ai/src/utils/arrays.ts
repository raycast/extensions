import { Event } from "../types/event";

export const sortEvents = (a: Partial<Event>, b: Partial<Event>) => {
  if (a.eventStart === undefined || b.eventStart === undefined) {
    return 0;
  }
  if (a.eventStart < b.eventStart) {
    return -1;
  }
  if (a.eventStart > b.eventStart) {
    return 1;
  }
  return 0;
};
