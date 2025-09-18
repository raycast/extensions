import { KubernetesContext } from "../types";

export interface SearchFilters {
  query: string;
  cluster?: string;
  user?: string;
  namespace?: string;
  showOnlyCurrent?: boolean;
  showOnlyWithNamespace?: boolean;
}

export interface SearchResult {
  context: KubernetesContext;
  relevanceScore: number;
  matchedFields: string[];
}

/**
 * Advanced fuzzy search with relevance scoring
 */
export function fuzzyMatch(text: string, query: string): number {
  if (!query) return 1;
  if (!text) return 0;

  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();

  // Exact match gets highest score
  if (textLower === queryLower) return 100;

  // Starts with query gets high score
  if (textLower.startsWith(queryLower)) return 90;

  // Contains query gets medium score
  if (textLower.includes(queryLower)) return 70;

  // Fuzzy matching for partial matches
  let score = 0;
  let queryIndex = 0;

  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      score += (queryLower.length - queryIndex) * 2;
      queryIndex++;
    }
  }

  // Normalize score based on query completion
  return queryIndex === queryLower.length ? score : 0;
}

/**
 * Search and filter contexts with advanced capabilities
 */
export function searchAndFilterContexts(contexts: KubernetesContext[], filters: SearchFilters): SearchResult[] {
  const results: SearchResult[] = [];

  for (const context of contexts) {
    // Apply boolean filters first
    if (filters.showOnlyCurrent && !context.current) continue;
    if (filters.showOnlyWithNamespace && !context.namespace) continue;
    if (filters.cluster && context.cluster !== filters.cluster) continue;
    if (filters.user && context.user !== filters.user) continue;
    if (filters.namespace && context.namespace !== filters.namespace) continue;

    // Calculate relevance score for text search
    let totalScore = 0;
    const matchedFields: string[] = [];

    if (filters.query) {
      // Search in name (highest weight)
      const nameScore = fuzzyMatch(context.name, filters.query) * 3;
      if (nameScore > 0) {
        totalScore += nameScore;
        matchedFields.push("name");
      }

      // Search in cluster (medium weight)
      const clusterScore = fuzzyMatch(context.cluster, filters.query) * 2;
      if (clusterScore > 0) {
        totalScore += clusterScore;
        matchedFields.push("cluster");
      }

      // Search in user (medium weight)
      const userScore = fuzzyMatch(context.user, filters.query) * 2;
      if (userScore > 0) {
        totalScore += userScore;
        matchedFields.push("user");
      }

      // Search in namespace (lower weight)
      if (context.namespace) {
        const namespaceScore = fuzzyMatch(context.namespace, filters.query);
        if (namespaceScore > 0) {
          totalScore += namespaceScore;
          matchedFields.push("namespace");
        }
      }

      // Skip contexts with no matches
      if (totalScore === 0) continue;
    } else {
      // No query means all contexts match
      totalScore = 50;
    }

    // Boost current context
    if (context.current) {
      totalScore += 20;
    }

    results.push({
      context,
      relevanceScore: totalScore,
      matchedFields,
    });
  }

  // Sort by relevance score (descending)
  return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
 * Get unique values for filter dropdowns
 */
export function getFilterOptions(contexts: KubernetesContext[]) {
  const clusters = new Set<string>();
  const users = new Set<string>();
  const namespaces = new Set<string>();

  contexts.forEach((context) => {
    clusters.add(context.cluster);
    users.add(context.user);
    if (context.namespace) {
      namespaces.add(context.namespace);
    }
  });

  return {
    clusters: Array.from(clusters).sort(),
    users: Array.from(users).sort(),
    namespaces: Array.from(namespaces).sort(),
  };
}

/**
 * Highlight matched text in search results
 */
export function highlightMatches(text: string, query: string): string {
  if (!query) return text;

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  return text.replace(regex, "**$1**");
}

/**
 * Recently used contexts storage (in-memory for Raycast)
 */
const MAX_RECENT_CONTEXTS = 5;
let recentContextsCache: string[] = [];

export function getRecentContexts(): string[] {
  return [...recentContextsCache];
}

export function addRecentContext(contextName: string): void {
  try {
    // Remove if already exists
    const filtered = recentContextsCache.filter((name) => name !== contextName);

    // Add to front
    recentContextsCache = [contextName, ...filtered].slice(0, MAX_RECENT_CONTEXTS);
  } catch (error) {
    console.warn("Failed to save recent context:", error);
  }
}
