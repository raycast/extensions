import { useCachedPromise } from "@raycast/utils";
import {
  fetchSnippetsForNote,
  fetchSnippet,
  fetchLatestSnippet,
  fetchFavoriteSnippets,
  createSnippet,
  updateSnippet,
  deleteSnippet,
  toggleFavorite,
  upvoteSnippet,
  downvoteSnippet,
} from "../api/snippets";
import { Snippet } from "../types";

/**
 * Hook to fetch snippets for a note
 */
export function useSnippets(noteId: string | undefined) {
  return useCachedPromise(
    async (id: string) => {
      if (!id) return [];
      return fetchSnippetsForNote(id);
    },
    [noteId || ""],
    {
      execute: !!noteId,
      keepPreviousData: true,
    },
  );
}

/**
 * Hook to fetch a single snippet
 */
export function useSnippet(snippetId: string | undefined) {
  return useCachedPromise(
    async (id: string) => {
      if (!id) return null;
      return fetchSnippet(id);
    },
    [snippetId || ""],
    {
      execute: !!snippetId,
      keepPreviousData: true,
    },
  );
}

/**
 * Hook to fetch the latest snippet for a note
 */
export function useLatestSnippet(noteId: string | undefined) {
  return useCachedPromise(
    async (id: string) => {
      if (!id) return null;
      return fetchLatestSnippet(id);
    },
    [noteId || ""],
    {
      execute: !!noteId,
      keepPreviousData: true,
    },
  );
}

/**
 * Hook to fetch all favorite snippets
 */
export function useFavoriteSnippets() {
  return useCachedPromise(
    async () => {
      return fetchFavoriteSnippets();
    },
    [],
    {
      keepPreviousData: true,
    },
  );
}

// Re-export mutation functions for use in components
export {
  createSnippet,
  updateSnippet,
  deleteSnippet,
  toggleFavorite,
  upvoteSnippet,
  downvoteSnippet,
};

/**
 * Get snippet version label
 */
export function getSnippetVersionLabel(
  snippet: Snippet,
  total: number,
): string {
  if (snippet.version === total) {
    return `Version ${snippet.version} (latest)`;
  }
  return `Version ${snippet.version}`;
}

/**
 * Format snippet for display
 */
export function formatSnippetContent(snippet: Snippet): string {
  let content = snippet.content;

  // Add title as heading if present
  if (snippet.title) {
    content = `## ${snippet.title}\n\n${content}`;
  }

  return content;
}

/**
 * Get status icons for snippet
 */
export function getSnippetStatusIcons(snippet: Snippet): string[] {
  const icons: string[] = [];

  if (snippet.favorite) {
    icons.push("❤️");
  }
  if (snippet.upvotes > 0) {
    icons.push("👍");
  }
  if (snippet.downvotes > 0) {
    icons.push("👎");
  }

  return icons;
}
