import { fetchKeyMetrics, KeyMetricsResponse } from "../api";

type Input = {
  /**
   * Required. The start date of the period to retrieve metrics for. ISO-8601 format (YYYY-MM-DD).
   */
  "start-date": string;
  /**
   * Required. The end date of the period to retrieve metrics for. ISO-8601 format (YYYY-MM-DD).
   */
  "end-date": string;
  /**
   * The interval for the metrics data points.
   */
  interval?: "day" | "week" | "month" | "quarter" | "year";
  /**
   * ISO 3166-1 Alpha-2 country code to filter metrics by geography.
   */
  geo?: string;
  /**
   * Array of plan names to filter metrics by specific plans.
   */
  plans?: string[];
};

/**
 * Retrieve key business metrics from ChartMogul including MRR, ARR, customer counts,
 * churn rates, LTV, ASP, and ARPA for a specified time period and interval.
 * @param {Input} options - The parameters for retrieving key metrics
 * @returns {Promise<KeyMetricsResponse>} The key metrics data
 */
export default async function (options: Input): Promise<KeyMetricsResponse> {
  const res = await fetchKeyMetrics(options);

  if (!res.ok) {
    throw new Error(`Failed to retrieve key metrics (${res.status})`);
  }

  return res.json();
}
