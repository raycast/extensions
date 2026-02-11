import type { Tool } from "@raycast/api";
import { YouTrackApi } from "../api/youtrack-api";
import { handleOnCatchError } from "../api/errors-helper";

type Input = {
  /**
   * Command query which will be applied to the issue. Possible options:
   - Add comment == `comment` and text should be put to 'comment' param
   - Assign to user == 'for %USERNAME%'
   - Change status == 'State %STATE%'
   - Add tag == 'tag %TAGNAME%'
   - Remove tag == 'untag %TAGNAME%'
   - Add work item == 'work '
   */
  command: string;
  /**
   * This field is used for confirmation presentation found as idReabale
   */
  idReadable: string;
  /**
   * This field is used only for 'Add comment' command
   */
  comment: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    info: Object.entries(input).map(([key, value]) => ({ name: key === "idReadable" ? "Issue" : key, value })),
    message: `Are you sure you want to apply the following command: "${input.command}"?`,
  };
};

/**
 * This tool applies command to a given issueId. It should be never called by itself, but as a companion tool.
 */
export default async function applyCommand(input: Input) {
  const api = YouTrackApi.getInstance();
  const { command: query, idReadable, comment } = input;

  try {
    await api.applyCommandToIssue(idReadable, { command: query, comment });
  } catch (error) {
    handleOnCatchError(error, "Error applying command");
    throw error;
  }
}
