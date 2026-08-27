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

export function locationWithInviteeDetails(location: EventTypeLocation, inviteeDetails?: string): EventTypeLocation {
  if (!locationNeedsInviteeDetails(location)) return location;
  const details = inviteeDetails?.trim();
  return {
    kind: location.kind,
    ...(details ? { location: details } : {}),
  };
}

export function locationDetailTitle(location: EventTypeLocation) {
  return location.kind === "outbound_call" ? "Phone Number" : "Location Details";
}

export function locationDetailPlaceholder(location: EventTypeLocation) {
  return location.kind === "outbound_call" ? "+1 555 123 4567" : "Address, room, or meeting details";
}

export function locationTitle(location: EventTypeLocation) {
  return location.location || location.kind.replaceAll("_", " ");
}

export function resolveConfiguredLocation(locations: EventTypeLocation[], locationIndex?: number) {
  if (typeof locationIndex === "number") {
    const location = locations[locationIndex];
    if (!location) {
      throw new Error("locationIndex is not a valid location on this event type.");
    }
    return location;
  }
  if (locations.length > 1) {
    throw new Error("Choose a locationIndex from the event type before booking.");
  }
  return locations[0];
}
