import { getAnalyticsOverview } from "../lib/api";

type Input = {
  /**
   * Time period for analytics: 7d, 30d, or 90d. Defaults to 30d.
   */
  period?: "7d" | "30d" | "90d";
};

export default async function tool(input: Input) {
  const response = await getAnalyticsOverview(input.period || "30d");
  return {
    period: response.period,
    overview: {
      total_posts: response.data.total_posts,
      total_engagement: response.data.total_engagement,
      total_impressions: response.data.total_impressions,
      average_engagement_rate: response.data.average_engagement_rate,
      top_performing_platform: response.data.top_performing_platform,
    },
    platforms: response.data.platform_breakdown,
  };
}
