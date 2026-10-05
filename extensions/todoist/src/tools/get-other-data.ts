import { sync_token, syncRequest } from "../api";
import { parseStringList } from "../helpers/parseStringList";
import { withTodoistApi } from "../helpers/withTodoistApi";

type Input = {
  /**
   * JSON array of resource types to retrieve (e.g. ["projects", "items"] or ["all", "-notes"]).
   * Supported values include labels, projects, items, notes, sections, filters, reminders, user, and all.
   * Prefix a value with a dash to exclude it.
   */
  resource_types: string;
};

export default withTodoistApi(async (input: Input) => {
  const data = await syncRequest({ sync_token, resource_types: parseStringList(input.resource_types) });
  return data;
});
