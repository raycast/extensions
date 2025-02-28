import { loadEntries } from "../lib/data";

/**
 * Returns the list of user's moods with timestamp, notes and tags
 */
export default async function () {
  return loadEntries({ convertDates: false });
}
