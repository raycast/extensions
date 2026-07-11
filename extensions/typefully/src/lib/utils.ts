import type { DraftListItem, Post, SocialSetListItem } from "./types";

export type GroupedSocialSets = {
  noTeam: SocialSetListItem[];
  teamOrder: string[];
  teamMap: Map<string, { name: string; items: SocialSetListItem[] }>;
};

export function groupSocialSetsByTeam(items: SocialSetListItem[]): GroupedSocialSets {
  const noTeam: SocialSetListItem[] = [];
  const teamOrder: string[] = [];
  const teamMap = new Map<string, { name: string; items: SocialSetListItem[] }>();

  for (const socialSet of items) {
    const team = socialSet.team;
    if (!team?.id) {
      noTeam.push(socialSet);
      continue;
    }
    if (!teamMap.has(team.id)) {
      teamMap.set(team.id, { name: team.name, items: [] });
      teamOrder.push(team.id);
    }
    teamMap.get(team.id)?.items.push(socialSet);
  }

  return { noTeam, teamOrder, teamMap };
}

export function buildPostsFromContent(content: string, splitThread: boolean): Post[] {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return [];
  }
  if (!splitThread) {
    const merged = normalized.replace(/\n+---\n+/g, "\n\n");
    return [{ text: merged }];
  }
  return normalized
    .split(/\n+---\n+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((text) => ({ text }));
}

export function getDraftDisplayTitle(draft: DraftListItem) {
  const title = normalizeDraftText(draft.draft_title);
  if (title) {
    return title;
  }
  const preview = normalizeDraftText(draft.preview);
  if (preview) {
    return preview;
  }
  return "Untitled Draft";
}

export function getDraftSubtitle(draft: DraftListItem) {
  if (normalizeDraftText(draft.draft_title)) {
    const preview = normalizeDraftText(draft.preview);
    if (preview) {
      return preview;
    }
  }
  return undefined;
}

export function getDraftDate(draft: DraftListItem) {
  const dateValue = draft.scheduled_date || draft.published_at || draft.updated_at || draft.created_at;
  if (!dateValue) {
    return undefined;
  }
  const date = new Date(dateValue);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

export function formatRelativeDate(date: Date) {
  const now = new Date();
  const diffSeconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const absDiff = Math.abs(diffSeconds);

  if (absDiff < 60) return rtf.format(0, "second"); // "now" / "just now" depending on locale
  const diffMinutes = Math.round(diffSeconds / 60);
  if (Math.abs(diffMinutes) < 60) return rtf.format(diffMinutes, "minute");
  const diffHours = Math.round(diffSeconds / 3600);
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, "hour");
  const diffDays = Math.round(diffSeconds / 86400);
  if (Math.abs(diffDays) < 30) return rtf.format(diffDays, "day");
  const diffMonths = Math.round(diffDays / 30);
  if (Math.abs(diffMonths) < 12) return rtf.format(diffMonths, "month");
  const diffYears = Math.round(diffDays / 365);
  return rtf.format(diffYears, "year");
}

function normalizeDraftText(text?: string | null) {
  if (!text) {
    return undefined;
  }
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized || undefined;
}

export function getErrorMessage(error: unknown, fallback = "Something went wrong") {
  if (error instanceof Error) {
    return error.message || fallback;
  }
  if (typeof error === "string") {
    return error || fallback;
  }
  return fallback;
}
