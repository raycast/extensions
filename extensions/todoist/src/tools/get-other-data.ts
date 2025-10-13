import { sync_token, syncRequest } from "../api";
import { withTodoistApi } from "../helpers/withTodoistApi";

type Input = {
  /**
   * Specifies the types of resources you want to retrieve after processing the commands.
   *
   * Possible values include:
   * - `"labels"`
   * - `"projects"`
   * - `"items"`
   * - `"notes"`
   * - `"sections"`
   * - `"filters"`
   * - `"reminders"`
   * - `"reminders_location"`
   * - `"locations"`
   * - `"user"`
   * - `"live_notifications"`
   * - `"collaborators"`
   * - `"user_settings"`
   * - `"notification_settings"`
   * - `"user_plan_limits"`
   * - `"completed_info"`
   * - `"stats"`
   * - `"all"`
   *
   * To exclude specific resources, prefix them with a dash (`-`).
   * For example, to include all resources except notes, use `["all", "-notes"]`.
   *
   * Example usage:
   * - `["projects", "items"]`: Fetches only the projects and items.
   * - `["all", "-notes"]`: Fetches all resources except for notes.
   */
  resource_types: string[];
};

export default withTodoistApi(async (input: Input) => {
  const data = await syncRequest({ sync_token, resource_types: input.resource_types });
  return data;
});
