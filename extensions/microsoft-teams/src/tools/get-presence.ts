import { getPresence } from "../api/presence";

type Input = {
  /** Microsoft Graph user ID returned by the Search Users tool. */
  userId: string;
};

export default async function tool(input: Input) {
  const presence = await getPresence(input.userId);
  return {
    userId: presence.id,
    availability: presence.availability,
    activity: presence.activity,
  };
}
