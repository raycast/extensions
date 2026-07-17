import { fetchAllPosts } from "../lib/buffer";
import { serviceLabel, truncate } from "../lib/format";
import { Post } from "../lib/types";

type Input = {
  /**
   * Which posts to return:
   * - "draft": unpublished drafts
   * - "scheduled": queued posts waiting to be published
   * - "sent": already published posts
   * - "all": every post (default)
   */
  status?: "draft" | "scheduled" | "sent" | "all";
  /** Optional channel id to restrict results to a single channel. */
  channelId?: string;
};

function matchesStatus(post: Post, status: Input["status"]): boolean {
  switch (status) {
    case "draft":
      return post.status === "draft";
    case "sent":
      return post.status === "sent";
    case "scheduled":
      return !!post.dueAt && post.status !== "draft" && post.status !== "sent";
    default:
      return true;
  }
}

export default async function (input: Input) {
  const status = input.status ?? "all";
  const { posts, truncated } = await fetchAllPosts();

  const results = posts
    .filter((p) => matchesStatus(p, status))
    .filter((p) => !input.channelId || p.channelId === input.channelId)
    .map((p) => ({
      id: p.id,
      status: p.status,
      text: truncate(p.text, 280),
      network: serviceLabel(p.channelService),
      channel: p.channel?.displayName || p.channel?.name,
      scheduledFor: p.dueAt,
      publishedAt: p.sentAt,
      link: p.externalLink,
    }));

  return { posts: results, truncated };
}
