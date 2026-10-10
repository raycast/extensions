import { getMeeting, isMeetingId } from "../data/meetings";
import { setFavorite } from "../lib/favorite-storage";

type Input = {
  /** A meeting ID returned by list-meetings. */
  meetingId: string;
  /** True to add to favorites, false to remove. Repeated calls preserve the requested state. */
  favorite: boolean;
};

/** Adds or removes a meeting from the same favorites shown in Start Meeting. */
export default async function tool(input: Input) {
  if (!isMeetingId(input.meetingId)) throw new Error("Unknown meeting ID. Use list-meetings to find an ID.");
  if (typeof input.favorite !== "boolean") throw new Error("favorite must be true or false.");
  const favorites = await setFavorite(input.meetingId, input.favorite);
  return {
    meetingId: input.meetingId,
    title: getMeeting(input.meetingId).title,
    isFavorite: input.favorite,
    favorites,
  };
}
