import { getPreferenceValues } from "@raycast/api";

import { getNotes } from "../api/getNotes";

type Input = {
  /** Optional text query used to search note titles and snippets. */
  searchText?: string;
  /** Optional comma-separated list of tags to filter notes by, e.g. "work,urgent". A note must have ALL given tags. */
  tags?: string;
};

export default async function (input: Input = {}) {
  const { maxQueryResults } = getPreferenceValues();
  const max = parseInt(maxQueryResults, 10) || 250;
  const tags = input.tags
    ?.split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  const notes = await getNotes(max, tags ?? [], input.searchText);
  return notes;
}
