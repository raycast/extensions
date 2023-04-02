import { bodyOf, get, post } from "./api";
import { showHUD } from "@raycast/api";

export type Availability = "Available" | "Busy" | "DoNotDisturb" | "BeRightBack" | "Away" | "Offline";
type Activity = "Available" | "Busy" | "DoNotDisturb" | "BeRightBack" | "Away" | "OffWork";

function activityFor(availability: Availability): Activity {
  switch (availability) {
    case "Offline":
      return "OffWork";
    default:
      return availability;
  }
}

function readableAvailability(availability: Availability) {
  return availability.replaceAll(/([A-Z])/g, " $1").toLowerCase().trim()
}

interface Presence {
  id: string
  availability: string
  activity: string
}

async function getPresence(){
  const response = await get({
    path: "/me/presence",
  })
  return bodyOf<Presence>(response)
}

async function setPreferredPresence(availability: Availability) {
  await post({
    path: "/me/presence/setUserPreferredPresence",
    body: {
      availability,
      activity: activityFor(availability),
    },
  });
}

export async function clearPreferredPresence() {
  await post({
    path: "/me/presence/clearUserPreferredPresence",
    body: {},
  });
}

export async function getAvailability() {
  const presence = await getPresence()
  return presence.availability
}

export async function setAvailability(availability?: Availability) {
  if (availability) {
    await setPreferredPresence(availability);
  } else {
    await clearPreferredPresence();
  }
  switch (availability) {
    case undefined:
      return await showHUD("Reset availability to default")
    case "Busy":
    case "DoNotDisturb":
      return await showHUD(`Set status to »${readableAvailability(availability)}« for 1 day`)
    default:
      return await showHUD(`Set status to »${readableAvailability(availability)}« for 7 days`)
  }
}
