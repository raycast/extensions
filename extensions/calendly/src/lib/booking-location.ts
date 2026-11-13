import type { EventType, EventTypeLocation } from "../api/types";

export function getBookingLocations(eventType: Pick<EventType, "locations" | "pooling_type">): EventTypeLocation[] {
  return eventType.pooling_type === "round_robin" ? [] : (eventType.locations ?? []);
}

export function locationDetailsError(location: EventTypeLocation | undefined, details: string): string | undefined {
  if (location?.kind === "outbound_call") {
    if (!details.trim()) return "Enter the invitee's phone number";
    if (!/^\+?\d{7,15}$/.test(details.replace(/[\s().-]/g, ""))) return "Enter a valid phone number";
  }
  if (location?.kind === "ask_invitee" && !details.trim()) return "Enter the invitee's meeting location";
}

export function resolveBookingLocation({
  eventType,
  selectedLocation,
  details = "",
}: {
  eventType: Pick<EventType, "locations" | "pooling_type">;
  selectedLocation: EventTypeLocation | undefined;
  details?: string;
}): EventTypeLocation | undefined {
  if (getBookingLocations(eventType).length === 0) return undefined;
  if (!selectedLocation) throw new Error("Choose a location from the event type before booking.");
  const error = locationDetailsError(selectedLocation, details);
  if (error) throw new Error(error);
  if (selectedLocation.kind === "outbound_call" || selectedLocation.kind === "ask_invitee") {
    return { kind: selectedLocation.kind, location: details.trim() };
  }
  return selectedLocation;
}
