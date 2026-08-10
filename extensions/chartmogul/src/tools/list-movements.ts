import { ActivitiesResponse, listActivities } from "../api";

type Input = {
  /**
   * The start date of the period to list activities for. ISO-8601 format.
   */
  "start-date"?: string;
  /**
   * The end date of the period to list activities for. ISO-8601 format.
   */
  "end-date"?: string;
  /**
   * The type of activity to list.
   */
  type?: "new_biz" | "reactivation" | "expansion" | "contraction" | "churn";
  /**
   * The order to list activities in. date or -date. Send -date by default to get the most recent first.
   */
  order?: string;
  /**
   * The cursor to use for pagination.
   */
  "start-after"?: string;
  /**
   * The number of activities to return per page.
   */
  "per-page"?: number;
  /**
   * The cursor to use for pagination.
   */
  cursor?: string;
};

/**
 * List MRR movements / activities in ChartMogul. All currency numbers are in cents.
 * @param {Input} options
 * @returns {Promise<ActivitiesResponse>}
 */
export default async function (options: Input): Promise<ActivitiesResponse> {
  const res = await listActivities(options);

  if (!res.ok) {
    throw new Error(`Failed to list movements (${res.status})`);
  }

  return res.json();
}
