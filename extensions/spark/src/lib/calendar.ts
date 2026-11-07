import { showToast, Toast } from "@raycast/api";
import { repeated } from "./args";
import { sparkJSON } from "./spark";
import { EventResult, HeldReply, isHeld } from "./types";
import { heldToast, showSparkFailure } from "./ui";

export type RsvpStatus = "accept" | "maybe" | "decline";

const RSVP_DONE: Record<RsvpStatus, string> = { accept: "Accepted", maybe: "Replied maybe", decline: "Declined" };

/// Every `event` verb needs Send access on the calendar's account.
async function runEventCommand(args: string[], done: (result: EventResult) => string): Promise<boolean> {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Updating calendar…" });
  try {
    const result = await sparkJSON<EventResult | HeldReply>(args);
    toast.style = Toast.Style.Success;
    if (isHeld(result)) Object.assign(toast, heldToast(result));
    else toast.title = done(result);
    return true;
  } catch (error) {
    await toast.hide();
    await showSparkFailure(error, "Calendar update failed");
    return false;
  }
}

/// `id` is a calendar event ID or the message ID of an invitation email.
export function rsvp(id: string, status: RsvpStatus): Promise<boolean> {
  return runEventCommand(["event", "rsvp", id, status], (result) =>
    result.already_set ? "Already answered" : RSVP_DONE[status],
  );
}

export interface NewEvent {
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  calendar?: string;
  location?: string;
  description?: string;
  videoConference?: "auto" | "meet" | "zoom" | "teams";
  attendees?: string[];
}

export function createEvent(event: NewEvent): Promise<boolean> {
  const args = ["event", "create", "--title", event.title, "--start", event.start];
  if (event.end && !event.allDay) args.push("--end", event.end);
  if (event.allDay) args.push("--all-day");
  if (event.calendar) args.push("--calendar", event.calendar);
  if (event.location) args.push("--location", event.location);
  if (event.description) args.push("--description", event.description);
  if (event.videoConference) args.push("--video-conference", event.videoConference);
  args.push(...repeated("--add", event.attendees));
  return runEventCommand(args, (result) => {
    const invited = result.attendee_changes?.added.length ?? 0;
    return invited ? `Event created, ${invited} invited` : "Event created";
  });
}
