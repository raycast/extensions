import { getPreferenceValues } from "@raycast/api";

import { getNotes } from "../api/getNotes";

type Input = {
  /** Optional text query used to search note titles and snippets. */
  searchText?: string;
};

export default async function (input: Input = {}) {
  const { maxQueryResults } = getPreferenceValues();
  const max = parseInt(maxQueryResults, 10) || 250;
  const notes = await getNotes(max, [], input.searchText);
  return notes;
}
