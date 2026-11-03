import { FollowCheck, Post, Profile } from "./schemas";
import { FeedPage } from "./feeds";

const COUNT_FORMAT = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const DATE_FORMAT = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });
const DAY_FORMAT = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

export function compactCount(count: number): string {
  return COUNT_FORMAT.format(count);
}

export function formatDate(date: string): string {
  return DATE_FORMAT.format(new Date(date));
}

export function formatDay(date: string): string {
  return DAY_FORMAT.format(new Date(date));
}

export function postTitle(text: string): string {
  return text.replace(/\s+/g, " ").trim() || "Post";
}

export function escapeMarkdown(text: string): string {
  return text
    .replace(/^[ \t]+/gm, "")
    .replace(/[\\`*_[\]<>#~|&]/g, "\\$&")
    .replace(/^([-+=])/gm, "\\$1")
    .replace(/^(\d+)([.)])/gm, "$1\\$2")
    .replace(/\n/g, "  \n");
}

export function postMarkdown(post: Post): string {
  const photos = (post.media ?? []).filter((item) => item.type === "photo");
  return [escapeMarkdown(post.text), ...photos.map((item) => `![](${item.mediaUrl})`)].join("\n\n");
}

export function profileMarkdown(profile: Profile): string {
  const lines = [
    profile.profilePicture ? `![](${profile.profilePicture})` : undefined,
    `# ${escapeMarkdown(profile.name)}`,
    escapeMarkdown(`@${profile.username}`),
    profile.description ? escapeMarkdown(profile.description) : undefined,
  ];
  return lines.filter((line) => line !== undefined).join("\n\n");
}

export function followMarkdown({ sourceUsername, targetUsername, isFollowing, isFollowedBy }: FollowCheck): string {
  const source = escapeMarkdown(`@${sourceUsername}`);
  const target = escapeMarkdown(`@${targetUsername}`);
  return [
    `# ${source} and ${target}`,
    `${source} ${isFollowing ? "follows" : "does not follow"} ${target}.`,
    `${target} ${isFollowedBy ? "follows" : "does not follow"} ${source}.`,
  ].join("\n\n");
}

export function postMetrics(post: Post): { title: string; count: string }[] {
  const metrics = [
    { title: "Likes", count: post.likeCount },
    { title: "Reposts", count: post.retweetCount },
    { title: "Replies", count: post.replyCount },
    { title: "Quotes", count: post.quoteCount },
    { title: "Views", count: post.viewCount },
    { title: "Bookmarks", count: post.bookmarkCount },
  ];
  return metrics.flatMap(({ title, count }) =>
    typeof count === "number" ? [{ title, count: compactCount(count) }] : [],
  );
}

export function profileLink(username: string): string {
  return `https://x.com/${username}`;
}

export function postLink(post: Post): string {
  return post.url ?? `https://x.com/i/status/${post.id}`;
}

export function compactPost(post: Post) {
  return {
    id: post.id,
    url: postLink(post),
    text: post.text,
    author: post.author?.username,
    createdAt: post.createdAt,
    likes: post.likeCount,
    reposts: post.retweetCount,
    replies: post.replyCount,
    views: post.viewCount,
  };
}

export function compactFeedPage({ posts, nextCursor }: FeedPage) {
  return { posts: posts.map(compactPost), nextCursor };
}

export function compactProfile(profile: Profile) {
  return {
    id: profile.id,
    username: profile.username,
    name: profile.name,
    url: profileLink(profile.username),
    description: profile.description,
    followers: profile.followers,
    following: profile.following,
    posts: profile.statusesCount,
    createdAt: profile.createdAt,
    location: profile.location,
    website: profile.url,
    emails: profile.contactInfo?.emails?.map((email) => email.value),
    links: profile.contactInfo?.links?.map((link) => link.url),
  };
}
