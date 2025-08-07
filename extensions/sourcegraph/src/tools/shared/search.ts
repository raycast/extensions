import { Sourcegraph } from "../../sourcegraph";
import { performSearch, PatternType, SearchResult, Alert, Suggestion } from "../../sourcegraph/stream-search";
import { SearchMatch, ContentMatch, SymbolMatch } from "../../sourcegraph/stream-search/stream";

/**
 * Execute a keyword search query against a Sourcegraph instance
 */
export async function executeKeywordSearch(
  src: Sourcegraph,
  query: string,
  maxResults: number,
): Promise<SearchResults> {
  return executeSearch(src, query, "keyword", maxResults);
}

/**
 * Execute an NLS (natural language) search query against a Sourcegraph instance
 */
export async function executeNLSSearch(src: Sourcegraph, query: string, maxResults: number): Promise<SearchResults> {
  return executeSearch(src, query, "nls", maxResults);
}

/**
 * Execute a commit search query against a Sourcegraph instance
 */
export async function executeCommitSearch(src: Sourcegraph, query: string, maxResults: number): Promise<SearchResults> {
  const commitQuery = `type:commit ${query}`;
  return executeSearch(src, commitQuery, "keyword", maxResults);
}

/**
 * Execute a diff search query against a Sourcegraph instance
 */
export async function executeDiffSearch(src: Sourcegraph, query: string, maxResults: number): Promise<SearchResults> {
  const diffQuery = `type:diff ${query}`;
  return executeSearch(src, diffQuery, "keyword", maxResults);
}

export interface SearchResults {
  matches: SearchMatch[];
  alerts: Alert[];
  suggestions: Suggestion[];
}

/**
 * Execute a search query against a Sourcegraph instance and return structured results
 */
export async function executeSearch(
  src: Sourcegraph,
  query: string,
  patternType: PatternType,
  maxResults: number,
): Promise<SearchResults> {
  return new Promise((resolve, reject) => {
    const results: SearchMatch[] = [];
    const alerts: Alert[] = [];
    const suggestions: Suggestion[] = [];
    let hasCompleted = false;
    const abortController = new AbortController();

    const handlers = {
      onResults: (searchResults: SearchResult[]) => {
        if (hasCompleted) return;

        // Extract the actual matches from the SearchResult objects
        const matches = searchResults.map((result) => result.match).filter((match): match is SearchMatch => !!match);
        results.push(...matches);

        // Stop collecting once we reach maxResults
        if (results.length >= maxResults) {
          hasCompleted = true;
          abortController.abort();
          resolve({ matches: results.slice(0, maxResults), alerts, suggestions });
        }
      },
      onSuggestions: (suggestionsData: Suggestion[]) => {
        suggestions.push(...suggestionsData);
      },
      onAlert: (alert: Alert) => {
        alerts.push(alert);
      },
      onProgress: () => {}, // Not needed for tool
      onDone: () => {
        if (!hasCompleted) {
          hasCompleted = true;
          resolve({ matches: results, alerts, suggestions });
        }
      },
    };

    // Use the existing performSearch function
    performSearch(abortController, src, query, patternType, handlers).catch((error) => {
      if (!hasCompleted) {
        hasCompleted = true;
        reject(error);
      }
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!hasCompleted) {
        hasCompleted = true;
        abortController.abort();
        resolve({ matches: results, alerts, suggestions });
      }
    }, 30000);
  });
}

/**
 * Format search results into a structured format suitable for AI consumption
 */
export function formatSearchResults(
  searchResults: SearchResults,
  src: Sourcegraph,
): { matches: unknown[]; alerts: Alert[]; suggestions: Suggestion[] } {
  const matches = searchResults.matches.map((result) => {
    switch (result.type) {
      case "content": {
        const contentMatch = result as ContentMatch;
        return {
          type: "content",
          repository: contentMatch.repository,
          file: contentMatch.path,
          url: `${src.instance}${contentMatch.repository}/-/blob/${contentMatch.path}`,
          matches:
            contentMatch.chunkMatches?.map((chunk) => ({
              content: chunk.content,
              contentTruncated: chunk.contentTruncated,
              ranges: chunk.ranges,
            })) || [],
        };
      }
      case "symbol": {
        const symbolMatch = result as SymbolMatch;
        return {
          type: "symbol",
          repository: symbolMatch.repository,
          file: symbolMatch.path,
          url: `${src.instance}${symbolMatch.repository}/-/blob/${symbolMatch.path}`,
          symbols:
            symbolMatch.symbols?.map((symbol) => ({
              name: symbol.name,
              kind: symbol.kind,
              line: symbol.line,
              containerName: symbol.containerName,
              url: symbol.url,
            })) || [],
        };
      }
      case "repo":
        return {
          type: "repository",
          repository: result.repository,
          url: `${src.instance}${result.repository}`,
          description: result.description,
          stars: result.repoStars,
        };
      case "path":
        return {
          type: "path",
          repository: result.repository,
          file: result.path,
          url: `${src.instance}${result.repository}/-/blob/${result.path}`,
          language: result.language,
        };
      default:
        return { type: result.type, repository: "repository" in result ? result.repository : undefined, raw: result };
    }
  });

  return { matches, alerts: searchResults.alerts, suggestions: searchResults.suggestions };
}
