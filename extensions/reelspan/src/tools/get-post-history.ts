import { client } from "../lib/client";

type Input = {
  /** Only this profile username */
  profile?: string;
  /** Only this network id, e.g. "tiktok" */
  platform?: string;
  /** Only "success" or "failed" posts */
  status?: "success" | "failed";
};

/** Recent posts, one row per network, newest first. */
export default async function tool(input: Input) {
  const r = await client().posts.history({
    profile_username: input.profile,
    platform: input.platform,
    status: input.status,
    limit: 20,
  });
  return r.history.map((h) => ({
    platform: h.platform,
    success: h.success,
    url: h.post_url,
    error: h.error,
    title: h.title,
    request_id: h.request_id,
    at: h.upload_timestamp,
  }));
}
