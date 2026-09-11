import type { ThawActionId } from "../data";
import { getThawAction } from "../data";
import { openThawUrl } from "./openUrl";

/** Run a Thaw action by its shared id (matches package.json command name). */
export const runThawAction = async (id: ThawActionId) => {
  const action = getThawAction(id);
  return openThawUrl(action.action, action.successMessage, action.query);
};
