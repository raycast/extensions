import { getSave } from "../api";
import { getErrorMessage } from "../errors";
import { formatSaveForAI, parseSaveId } from "../save-utils";

type Input = {
  /** A savee.com link (https://savee.com/i/997d6DW/), a 7-character short id, or a save id */
  save: string;
};

/** Fetches one Savee save: the user's own, or any public save. */
export default async function tool(input: Input) {
  try {
    return formatSaveForAI(await getSave(parseSaveId(input.save)));
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}
