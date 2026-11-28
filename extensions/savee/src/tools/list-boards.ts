import { listBoards } from "../api";
import { getErrorMessage } from "../errors";
import { flattenBoards, formatBoardForAI } from "../save-utils";

/** Lists every Savee board the user can see, including sub boards, team and collaborator boards. */
export default async function tool() {
  try {
    return { boards: flattenBoards(await listBoards()).map(formatBoardForAI) };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}
