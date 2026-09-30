import { getScheduledPosts, parseApiDate } from "../api";

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

type Input = {
  /**
   * Optional profile username to only list that profile's scheduled posts.
   */
  profile?: string;
  /**
   * Optional ISO-8601 lower bound (inclusive) on the scheduled date.
   */
  from?: string;
  /**
   * Optional ISO-8601 upper bound (exclusive) on the scheduled date.
   */
  to?: string;
  /**
   * How many scheduled posts to return (1-100). Defaults to 25.
   */
  limit?: number;
  /**
   * How many scheduled posts to skip, to read the next page. Defaults to 0. Use `next_offset` from the previous call.
   */
  offset?: number;
};

export default async function tool(input: Input) {
  const limit = Math.min(Math.max(Math.trunc(input.limit ?? DEFAULT_LIMIT), 1), MAX_LIMIT);
  const offset = Math.max(Math.trunc(input.offset ?? 0), 0);
  const { scheduled_posts, total } = await getScheduledPosts({
    profile: input.profile,
    from: input.from,
    to: input.to,
    limit,
    offset,
  });
  const count = total ?? offset + scheduled_posts.length;
  const nextOffset = offset + scheduled_posts.length;
  return {
    total: count,
    offset,
    next_offset: nextOffset < count ? nextOffset : undefined,
    scheduled_posts: scheduled_posts.map((post) => ({
      job_id: post.job_id,
      scheduled_date: parseApiDate(post.scheduled_date)?.toISOString() ?? post.scheduled_date,
      post_type: post.post_type,
      profile_username: post.profile_username,
      title: post.title,
      platforms: post.platforms,
      external_id: post.external_id ?? undefined,
    })),
  };
}
