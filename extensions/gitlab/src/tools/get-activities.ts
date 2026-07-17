import { gitlab } from "../common";

export type Input = {
  /**
   * `my` (default, only mine) or `all` (all activities in my projects)
   */
  scope?: "my" | "all";
  /**
   * client-side filtering (backend API currently doesn't support search for events)
   */
  search?: string;
};

type ActivityEvent = {
  action_name?: string;
  target_title?: string;
};

/**
 * Get recent activities
 */
export default async function ({ scope, search }: Input) {
  const params: Record<string, string> = {};

  if (scope === "all") {
    params.scope = "all";
  }

  const events = (await gitlab.fetch("events", params)) as ActivityEvent[];

  if (search && search.length > 0) {
    const searchLower = search.toLowerCase();

    return events.filter((event) => {
      const action = String(event.action_name || "").toLowerCase();
      const title = String(event.target_title || "").toLowerCase();
      return action.includes(searchLower) || title.includes(searchLower);
    });
  }

  return events;
}
