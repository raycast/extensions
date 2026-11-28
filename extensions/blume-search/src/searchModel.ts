import { basename } from "node:path";

import { GLOBAL_SEARCH_CATEGORIES, type GlobalSearchCategory, type GlobalSearchResult } from "./protocol.ts";

export const ALL_SEARCH_CATEGORIES = [...GLOBAL_SEARCH_CATEGORIES];
export type SearchCategoryFilter = "all" | GlobalSearchCategory;

export const SEARCH_CATEGORY_LABELS: Record<GlobalSearchCategory, string> = {
  conversations: "Conversations",
  messages: "Messages",
  projects: "Projects",
  setup: "Setup",
  suggestions: "Suggestions",
  commits: "Commits",
};

export const SEARCH_CATEGORY_ICONS: Record<GlobalSearchCategory, string> = {
  conversations: "conversations.svg",
  messages: "messages.svg",
  projects: "projects.svg",
  setup: "setup.svg",
  suggestions: "suggestions.svg",
  commits: "commits.svg",
};

export function categoriesForFilter(filter: SearchCategoryFilter): GlobalSearchCategory[] {
  return filter === "all" ? [...ALL_SEARCH_CATEGORIES] : [filter];
}

function segment(value: string): string {
  return encodeURIComponent(value);
}

/** A commit opens on GitHub when its repository is a GitHub remote; Blume has no local commit page. */
export function commitWebUrl(result: GlobalSearchResult): string | null {
  if (result.category !== "commits") return null;
  const match = /^github\.com\/([^/\s]+)\/([^/\s]+)$/i.exec(result.repository);
  if (!match || !/^[0-9a-f]{40}$/i.test(result.sha)) return null;
  return `https://github.com/${segment(match[1])}/${segment(match[2])}/commit/${result.sha}`;
}

/** Maps the shared search DTO to routes already owned by the Blume app; null when it has none. */
export function blumeDeepLinkForResult(
  result: GlobalSearchResult,
  protocol: "blume" | "blume-canary" = "blume",
): string | null {
  switch (result.category) {
    case "commits":
      return null;
    case "conversations":
    case "messages":
      return `${protocol}://agents/${segment(result.conversationRef)}`;
    case "projects":
      return `${protocol}://setup/project/${segment(result.projectId)}`;
    case "suggestions":
      return `${protocol}://suggestions/${segment(result.suggestionId)}`;
    case "setup": {
      const entryName = result.sourcePath ? basename(result.sourcePath) : null;
      if (entryName) {
        return `${protocol}://setup/${segment(result.harnessId)}/entries/${segment(entryName)}`;
      }
      if (result.projectId) return `${protocol}://setup/project/${segment(result.projectId)}`;
      return `${protocol}://setup/${segment(result.harnessId)}`;
    }
  }
}

export function resultSubtitle(result: GlobalSearchResult): string | undefined {
  const parts = [result.subtitle, result.excerpt]
    .map((part) => part?.replace(/\s+/g, " ").trim())
    .filter((part): part is string => Boolean(part));
  return parts.length > 0 ? Array.from(new Set(parts)).join(" · ") : undefined;
}
