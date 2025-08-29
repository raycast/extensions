import { listOpportunities } from "../api";

type Input = {
  /**
   * The cursor to use for pagination.
   */
  cursor?: string;
  /**
   * The number of opportunities to return per page.
   */
  per_page?: number;
  /**
   * Filter opportunities by owner email.
   */
  owner?: string;
  /**
   * Filter opportunities by pipeline stage.
   */
  stage?: string;
  /**
   * Filter opportunities by forecast category.
   */
  forecast_category?: "upside" | "commit" | "best_case" | "closed";
  /**
   * Filter opportunities with win likelihood greater than or equal to this value (0-100).
   */
  win_likelihood_gte?: number;
  /**
   * Filter opportunities with win likelihood less than or equal to this value (0-100).
   */
  win_likelihood_lte?: number;
};

/**
 * List opportunities in ChartMogul by owner, stage, forecast category, and win likelihood.
 * @param {Input} param0
 * @returns {Promise<OpportunitiesResponse>}
 */
export default async function ({
  cursor,
  per_page,
  owner,
  stage,
  forecast_category,
  win_likelihood_gte,
  win_likelihood_lte,
}: Input) {
  const res = await listOpportunities({
    cursor,
    per_page,
    owner,
    stage,
    forecast_category,
    win_likelihood_gte,
    win_likelihood_lte,
  });

  if (!res.ok) {
    throw new Error(`Failed to list opportunities (${res.status})`);
  }

  return res.json();
}
