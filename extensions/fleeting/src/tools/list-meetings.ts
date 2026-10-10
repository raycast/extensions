import { getPreferenceValues } from "@raycast/api";
import { MEETINGS } from "../data/meetings";
import { localTimeZone } from "../lib/calendar";
import { getFavorites } from "../lib/favorite-storage";
import { meetingUrl, resolveMeetingId } from "../lib/urls";

type Input = {
  /** Search titles, descriptions, categories, IDs, and keywords. Omit to list all meetings. */
  query?: string;
  /** Only return the user's favorite meetings. */
  favoritesOnly?: boolean;
};

/** Lists fictional meeting scenarios, their links, favorites, preferences, and the device time zone. */
export default async function tool(input: Input) {
  const favorites = await getFavorites();
  const prefs = getPreferenceValues<Preferences>();
  const terms = input.query?.trim().toLowerCase().split(/\s+/).filter(Boolean) ?? [];
  const meetings = MEETINGS.filter((meeting) => {
    if (input.favoritesOnly && !favorites.includes(meeting.id)) return false;
    const text = [meeting.id, meeting.title, meeting.description, meeting.category, ...meeting.keywords]
      .join(" ")
      .toLowerCase();
    return terms.every((term) => text.includes(term));
  }).map((meeting) => ({ ...meeting, url: meetingUrl(meeting.id), isFavorite: favorites.includes(meeting.id) }));
  return {
    meetings,
    preferences: { ...prefs, preferredMeeting: resolveMeetingId(prefs.preferredMeeting) },
    timeZone: localTimeZone(),
    currentTime: new Date().toISOString(),
  };
}
