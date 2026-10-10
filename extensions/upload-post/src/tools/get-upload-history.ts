import { getUploadHistory, HISTORY_PAGE_SIZES, postUrl } from "../api";

type Input = {
  /**
   * Optional profile username to only return that profile's uploads.
   */
  profile?: string;
  /**
   * Optional platform id to filter by (for example "instagram", "tiktok", "x").
   */
  platform?: string;
  /**
   * Optional result filter: "success" for published posts, "failed" for failed ones.
   */
  status?: "success" | "failed";
  /**
   * Optional start of the date range (YYYY-MM-DD). Requires end. The range can be at most 2 months.
   */
  start?: string;
  /**
   * Optional end of the date range (YYYY-MM-DD). Requires start.
   */
  end?: string;
  /**
   * How many uploads to return: 10, 20, 50 or 100. Defaults to 20.
   */
  limit?: number;
};

export default async function tool(input: Input) {
  const limit = HISTORY_PAGE_SIZES.find((size) => size >= (input.limit ?? 20)) ?? 100;
  const { history } = await getUploadHistory({ ...input, limit });
  return history.map((item) => ({
    platform: item.platform,
    profile_username: item.profile_username,
    media_type: item.media_type,
    upload_timestamp: item.upload_timestamp,
    success: item.success,
    post_url: postUrl(item),
    sent_to_tiktok_inbox: item.fallback_to_inbox || undefined,
    error_message: item.error_message ?? undefined,
    post_title: item.post_title ?? undefined,
    request_id: item.request_id ?? undefined,
    job_id: item.job_id ?? undefined,
  }));
}
