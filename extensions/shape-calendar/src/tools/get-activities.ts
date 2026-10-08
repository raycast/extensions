import { getActivities } from "../api/client";
import { toLocalDateString } from "../utils";

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
    | "tennis"
    | "skiing"
    | "nordicski"
    | "strength"
    | "surf"
    | "other";
  /**
   * Filter by completion status: "true" for completed, "false" for planned
   */
  completed?: string;
  /**
   * Include planned activities that have been paired with a completed activity. By default these are hidden. Set to true when looking for the planned ID before unpairing.
   */
  includePaired?: boolean;
};

export default async function (input: Input) {
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const res = await getActivities({
    from: input.from || toLocalDateString(thirtyDaysAgo),
    to: input.to || toLocalDateString(today),
    sportType: input.sportType,
    completed: input.completed,
    includePaired: input.includePaired,
    limit: 200,
  });

  return res.activities;
}
