import { APP_URL } from "./client";
import { CreatePostBody, Platform, Post, PostIssue, PostStatus, PostValidationReport, SocialAccount } from "./types";

export type PostTiming = "draft" | "schedule" | "now";

export type PostDraft = {
  text: string;
  accountIds: string[];
  timing: PostTiming;
  scheduledAt: Date | null;
};

export const PLATFORM_LABELS: Record<Platform, string> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  THREADS: "Threads",
  TIKTOK: "TikTok",
  TWITTER: "X",
  BLUESKY: "Bluesky",
  LINKEDIN: "LinkedIn",
  PINTEREST: "Pinterest",
  YOUTUBE: "YouTube",
  MASTODON: "Mastodon",
  TELEGRAM: "Telegram",
  GOOGLE_BUSINESS: "Google Business",
  TUMBLR: "Tumblr",
  WORDPRESS: "WordPress",
};

const MEDIA_ONLY_PLATFORMS: readonly Platform[] = ["INSTAGRAM", "TIKTOK", "PINTEREST", "YOUTUBE"];

export const canPostText = (account: SocialAccount): boolean => !MEDIA_ONLY_PLATFORMS.includes(account.platform);

export const POST_STATUS_LABELS: Record<PostStatus, string> = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  PENDING: "Pending",
  PUBLISHING: "Publishing",
  COMPLETED: "Published",
  PARTIAL_FAILURE: "Partly Failed",
  FAILED: "Failed",
};

const APP_PATH_BY_STATUS: Record<PostStatus, string> = {
  DRAFT: "/drafts",
  SCHEDULED: "/scheduled",
  PENDING: "/scheduled",
  PUBLISHING: "/posted",
  COMPLETED: "/posted",
  PARTIAL_FAILURE: "/posted",
  FAILED: "/posted",
};

export const localTimezone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone;

export const formatDateTime = (value: string): string =>
  new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

export const appUrlForPost = (post: Post): string => `${APP_URL}${APP_PATH_BY_STATUS[post.status]}`;

export function postTitle(post: Post): string {
  const firstLine = post.text
    ?.split("\n")
    .map((line) => line.trim())
    .find(Boolean);
  return firstLine ?? `${post.contentType.charAt(0)}${post.contentType.slice(1).toLowerCase()} post without text`;
}

export function postDate(post: Post): string {
  const publishedAt = post.platforms.map((platform) => platform.publishedAt).find(Boolean);
  return post.scheduledAt ?? publishedAt ?? post.createdAt;
}

export function postImage(post: Post): string | undefined {
  const preview = post.platforms.flatMap((platform) => platform.previewUrls).find(Boolean);
  return preview ?? post.thumbnailUrl ?? (post.contentType === "IMAGE" ? post.mediaUrls[0] : undefined);
}

export const publishedLink = (post: Post): string | undefined =>
  post.platforms.map((platform) => platform.postUrl).find(Boolean);

export function buildCreatePostBody(postDraft: PostDraft, timezone: string): CreatePostBody {
  const body: CreatePostBody = {
    contentType: "TEXT",
    text: postDraft.text.trim(),
    accountIds: postDraft.accountIds,
    timezone,
  };
  if (postDraft.timing === "draft") return { ...body, saveAsDraft: true };
  if (postDraft.timing === "schedule" && postDraft.scheduledAt) {
    return { ...body, scheduledAt: postDraft.scheduledAt.toISOString() };
  }
  return body;
}

const blockingMessages = (issues: PostIssue[]): string[] =>
  issues.filter((issue) => issue.severity === "ERROR").map((issue) => issue.message);

export function validationErrors(report: PostValidationReport): string[] {
  const accountErrors = report.accounts.flatMap((account) => {
    const name = account.accountName ?? PLATFORM_LABELS[account.platform];
    return blockingMessages(account.issues).map((message) => `${name}: ${message}`);
  });
  return [...blockingMessages(report.issues), ...accountErrors];
}
