import { Icon } from "@raycast/api";
import { Event } from "../types/event";

export type ApiResponseEvents = Event[];

export type ApiResponseMoment = {
  event?: Event | null;
  additionalEvents: Event[];
  now: string;
};

export type EventAction = { title: string; action: () => Promise<unknown | void> | unknown; icon: Icon };

export type EventActions = EventAction[];
