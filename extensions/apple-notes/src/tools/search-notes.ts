import { getPreferenceValues } from "@raycast/api";

import { getNotes } from "../api/getNotes";

export default async function () {
  const { maxQueryResults } = getPreferenceValues();
  const max = parseInt(maxQueryResults) ?? 250;
  const notes = await getNotes(max);
  return notes;
}
