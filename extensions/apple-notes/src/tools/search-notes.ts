import { getPreferenceValues } from "@raycast/api";

import { getNotes } from "../api/getNotes";

export default async function () {
  const { maxQueryResults } = getPreferenceValues();
  const max = Number.isNaN(parseInt(maxQueryResults)) ? 250 : parseInt(maxQueryResults);
  const notes = await getNotes(max);
  return notes;
}
