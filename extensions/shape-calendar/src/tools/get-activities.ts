import { getActivities } from "../api/client";

type Input = {
  /**
   * Start date for the range in ISO format (YYYY-MM-DD). Defaults to 30 days ago.
   */
  from?: string;
  /**
   * End date for the range in ISO format (YYYY-MM-DD). Defaults to today.
   */
  to?: string;
  /**
   * Filter by sport type
   */
  sportType?:
    | "run"
    | "bike"
    | "swim"
    | "hike"
    | "yoga"
    | "nordicski"
    | "strength"
    | "other";
  /**
   * Filter by completion status: "true" for completed, "false" for planned
   */
  completed?: string;
};

export default async function (input: Input) {
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const res = await getActivities({
    from: input.from || thirtyDaysAgo.toISOString().split("T")[0],
    to: input.to || today.toISOString().split("T")[0],
    sportType: input.sportType,
    completed: input.completed,
    limit: 200,
  });

  return res.activities;
}
