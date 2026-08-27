import { EventTypeLocation } from "../api/types";

export function locationNeedsInviteeDetails(location: EventTypeLocation): boolean {
  switch (location.kind) {
    case "ask_invitee":
    case "outbound_call":
      return true;
    case "custom":
    case "physical":
      return !location.location?.trim();
    default:
      return false;
  }
}

export function locationDetailTitle(location: EventTypeLocation) {
  return location.kind === "outbound_call" ? "Phone Number" : "Location Details";
}

export function locationDetailPlaceholder(location: EventTypeLocation) {
  return location.kind === "outbound_call" ? "+1 555 123 4567" : "Address, room, or meeting details";
}
