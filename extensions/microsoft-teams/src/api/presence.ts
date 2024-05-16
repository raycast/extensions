import { bodyOf, failIfNotOk, get, post } from "./api";
import { showHUD } from "@raycast/api";

export type Availability =
  | "Available"
  | "Busy"
  | "DoNotDisturb"
  | "BeRightBack"
  | "Away"
  | "Offline"
  | "PresenceUnknown";
type Activity = "Available" | "Busy" | "DoNotDisturb" | "BeRightBack" | "Away" | "OffWork" | "Unknown";

function activityFor(availability: Availability): Activity {
  switch (availability) {
    case "Offline":
      return "OffWork";
    case "PresenceUnknown":
      return "Unknown";
    default:
      return availability;
  }
}

function readableAvailability(availability: Availability) {
  return availability
    .replaceAll(/([A-Z])/g, " $1")
    .toLowerCase()
    .trim();
}

export interface Presence {
  id: string;
  availability: string;
  activity: string;
}

export function defaultPresence(): Presence {
  return { id: "", availability: "PresenceUnknown", activity: "Available" };
}

export async function getPresence(entityId?: string) {
  const response = await get({
    path: entityId === undefined ? "/me/presence" : `/users/${entityId.split(":")[1].split(":")[0]}/presence`,
  });
  await failIfNotOk(response, "Getting presence");
  return bodyOf<Presence>(response);
}

async function setPreferredPresence(availability: Availability) {
  const response = await post({
    path: "/me/presence/setUserPreferredPresence",
    body: {
      availability,
      activity: activityFor(availability),
    },
  });
  await failIfNotOk(response, "Setting presence");
}

export async function clearPreferredPresence() {
  const response = await post({
    path: "/me/presence/clearUserPreferredPresence",
    body: {},
  });
  await failIfNotOk(response, "Clearing presence");
}

export async function getAvailability() {
  const presence = await getPresence();
  return presence.availability;
}

export async function setAvailability(availability?: Availability) {
  if (availability) {
    await setPreferredPresence(availability);
  } else {
    await clearPreferredPresence();
  }
  switch (availability) {
    case undefined:
      return await showHUD("Reset availability to default");
    case "Busy":
    case "DoNotDisturb":
      return await showHUD(`Set status to "${readableAvailability(availability)}" (expires in 1 day)`);
    default:
      return await showHUD(`Set status to "${readableAvailability(availability)}" (expires in 7 days)`);
  }
}
