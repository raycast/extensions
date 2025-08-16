import { SearchResponse, TextContent, CategoryGroup, SearchResult } from "../types/sefaria";
import { APP_CONSTANTS } from "../constants/app";
import { extractReferenceFromId } from "../utils/text-processing";

/**
 * Sefaria API client with proper error handling and type safety
 */
export class SefariaApi {
  private static readonly BASE_URL = "https://www.sefaria.org/api";
  private static readonly SEARCH_ENDPOINT = `${SefariaApi.BASE_URL}/search-wrapper`;
  private static readonly TEXT_ENDPOINT = `${SefariaApi.BASE_URL}/v3/texts`;

  /**
   * Create a fetch request with timeout handling
   */
  private static async fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), APP_CONSTANTS.API.REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Request timed out after ${APP_CONSTANTS.API.REQUEST_TIMEOUT_MS}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Search for texts in Sefaria with pagination support
   */
  static async search(
    query: string,
    size: number = APP_CONSTANTS.SEARCH.DEFAULT_PAGE_SIZE,
    from: number = 0,
  ): Promise<SearchResponse> {
    if (!query.trim()) {
      return { hits: { hits: [], total: 0 } };
    }

    const response = await SefariaApi.fetchWithTimeout(SefariaApi.SEARCH_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: query.trim(),
        size,
        from,
        type: "text",
      }),
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data as SearchResponse;
  }

  /**
   * Get text content for a specific reference
   */
  static async getText(reference: string): Promise<{ hebrew: TextContent; english?: TextContent }> {
    if (!reference.trim()) {
      throw new Error("Reference cannot be empty");
    }

    const cleanRef = reference.trim();
    const encodedRef = encodeURIComponent(cleanRef);

    // Fetch Hebrew version (default)
    const hebrewResponse = await SefariaApi.fetchWithTimeout(`${SefariaApi.TEXT_ENDPOINT}/${encodedRef}`);

    if (!hebrewResponse.ok) {
      // Try to provide more context for the error
      const errorMsg = `Failed to fetch Hebrew text for "${reference}": ${hebrewResponse.status} ${hebrewResponse.statusText}`;
      console.warn(errorMsg);
      throw new Error(errorMsg);
    }

    const hebrewData = await hebrewResponse.json();

    // Try to fetch English version
    let englishData = null;
    try {
      const englishResponse = await SefariaApi.fetchWithTimeout(
        `${SefariaApi.TEXT_ENDPOINT}/${encodedRef}?version=english`,
      );
      if (englishResponse.ok) {
        englishData = await englishResponse.json();
      }
    } catch (error) {
      // English version not available, continue with Hebrew only
      console.warn(`English version not available for ${reference}:`, error);
    }

    return { hebrew: hebrewData, english: englishData };
  }

  /**
   * Search for texts and group by category
   */
  static async searchWithCategories(query: string): Promise<CategoryGroup[]> {
    if (!query.trim()) {
      return [];
    }

    // Fetch a larger set of results to get good category distribution
    const response = await SefariaApi.search(query, APP_CONSTANTS.SEARCH.CATEGORY_SEARCH_SIZE);
    const results = response.hits.hits;

    if (results.length === 0) {
      return [];
    }

    // Create batches for parallel processing
    const batches = [];
    for (let i = 0; i < results.length; i += APP_CONSTANTS.API.BATCH_SIZE) {
      batches.push(results.slice(i, i + APP_CONSTANTS.API.BATCH_SIZE));
    }

    // Process all batches in parallel
    const batchPromises = batches.map(async (batch) => {
      const batchResults = await Promise.all(
        batch.map(async (result) => {
          try {
            const reference = extractReferenceFromId(result._id);
            const textData = await SefariaApi.getText(reference);
            const primaryCategory = textData.hebrew.primary_category || "Other";

            return { category: primaryCategory, result };
          } catch (error) {
            // If we can't fetch text data, categorize as 'Other'
            console.warn(`Failed to fetch category for ${result._id}:`, error);
            return { category: "Other", result };
          }
        }),
      );
      return batchResults;
    });

    // Wait for all batches to complete
    const allBatchResults = await Promise.all(batchPromises);
    const categoryResults = allBatchResults.flat();

    // Group results by category using reduce for better performance
    const categoryMap = categoryResults.reduce((acc, { category, result }) => {
      if (!acc.has(category)) {
        acc.set(category, []);
      }
      const categoryResults = acc.get(category);
      if (categoryResults) {
        categoryResults.push(result);
      }
      return acc;
    }, new Map<string, SearchResult[]>());

    // Convert map to CategoryGroup array and sort by count
    const categories: CategoryGroup[] = Array.from(categoryMap.entries())
      .map(([category, results]) => ({
        category,
        count: results.length,
        results,
      }))
      .sort((a, b) => b.count - a.count);

    return categories;
  }
}
