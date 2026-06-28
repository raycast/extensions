import { getPresence, readableAvailability } from "../api/presence";

/**
 * Gets the current Microsoft Teams presence (availability) of the signed-in
 * user.
 */
export default async function () {
  const presence = await getPresence();
  return {
    availability: presence.availability,
    activity: presence.activity,
    readable: readableAvailability(presence.availability),
  };
}
