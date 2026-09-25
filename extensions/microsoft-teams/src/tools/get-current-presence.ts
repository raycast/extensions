import { getPresence } from "../api/presence";

export default async function tool() {
  const presence = await getPresence();
  return {
    userId: presence.id,
    availability: presence.availability,
    activity: presence.activity,
  };
}
