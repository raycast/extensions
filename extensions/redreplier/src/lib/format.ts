import { KeywordStatus, Mention, MentionSource, MentionStatus, Website } from "./types";

export const MAX_KEYWORD_LENGTH = 255;

export const SOURCE_LABELS: Record<MentionSource, string> = {
  REDDIT_POST: "Reddit Post",
  REDDIT_COMMENT: "Reddit Comment",
  TWITTER: "X",
  BLUESKY: "Bluesky",
  HACKERNEWS: "Hacker News",
  FACEBOOK: "Facebook",
  FACEBOOK_GROUP: "Facebook Group",
};

export const MENTION_STATUS_LABELS: Record<MentionStatus, string> = {
  NEW: "New",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const KEYWORD_STATUS_LABELS: Record<KeywordStatus, string> = {
  ACTIVE: "Active",
  PENDING: "Pending",
  DISABLED: "Disabled",
  SUSPENDED: "Suspended",
};

export const websiteName = (website: Website): string => website.name || website.domain;

export const activeKeywordCount = (website: Website): number =>
  website.keywords.filter((keyword) => keyword.status === "ACTIVE").length;

export const formatDate = (value: string): string =>
  new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

const asPlainMarkdown = (text: string): string => text.replace(/!\[/g, "\\![");

export function mentionTitle(mention: Mention): string {
  const firstLine = mention.contentText
    ?.split("\n")
    .map((line) => line.trim())
    .find(Boolean);
  return mention.title?.trim() || firstLine || `${SOURCE_LABELS[mention.source]} Mention`;
}

export function mentionMarkdown(mention: Mention): string {
  return [
    `# ${asPlainMarkdown(mentionTitle(mention))}`,
    mention.contentText ? asPlainMarkdown(mention.contentText) : "",
    mention.relevanceReason ? `## Why It Matched\n\n${asPlainMarkdown(mention.relevanceReason)}` : "",
    mention.aiReplySuggestion ? `## Suggested Reply\n\n${asPlainMarkdown(mention.aiReplySuggestion)}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function parseKeywords(input: string): string[] {
  const keywords = input
    .split(/[\n,]/)
    .map((keyword) => keyword.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  return keywords.filter((keyword) => {
    const key = keyword.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function addedKeywordsSummary(website: Website, requested: string[]): string {
  const requestedKeys = new Set(requested.map((keyword) => keyword.toLowerCase()));
  const added = website.keywords.filter((keyword) => requestedKeys.has(keyword.value.toLowerCase()));
  const pending = added.filter((keyword) => keyword.status === "PENDING").length;
  const active = added.filter((keyword) => keyword.status === "ACTIVE").length;
  return pending > 0 ? `${active} active, ${pending} waiting for plan room` : `${active} active`;
}
