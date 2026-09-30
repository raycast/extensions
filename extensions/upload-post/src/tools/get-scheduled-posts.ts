import { getAllScheduledPosts, parseApiDate } from "../api";

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
};

export default async function tool(input: Input) {
  const { scheduled_posts, total } = await getAllScheduledPosts(input);
  return {
    total: total ?? scheduled_posts.length,
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
