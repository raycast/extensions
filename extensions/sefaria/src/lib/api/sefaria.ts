import { SearchResponse, TextContent, CategoryGroup, SearchResult } from "../types/sefaria";

/**
 * Sefaria API client with proper error handling and type safety
 */
export class SefariaApi {
  private static readonly BASE_URL = "https://www.sefaria.org/api";
  private static readonly SEARCH_ENDPOINT = `${SefariaApi.BASE_URL}/search-wrapper`;
  private static readonly TEXT_ENDPOINT = `${SefariaApi.BASE_URL}/v3/texts`;
  private static readonly DEFAULT_SEARCH_SIZE = 20;
  private static readonly CATEGORY_SEARCH_SIZE = 100;

  /**
   * Search for texts in Sefaria with pagination support
   */
  static async search(
    query: string,
    size: number = SefariaApi.DEFAULT_SEARCH_SIZE,
    from: number = 0,
  ): Promise<SearchResponse> {
    if (!query.trim()) {
      return { hits: { hits: [], total: 0 } };
    }

    const response = await fetch(SefariaApi.SEARCH_ENDPOINT, {
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
    const hebrewResponse = await fetch(`${SefariaApi.TEXT_ENDPOINT}/${encodedRef}`);

    if (!hebrewResponse.ok) {
      throw new Error(`Failed to fetch Hebrew text: ${hebrewResponse.status} ${hebrewResponse.statusText}`);
    }

    const hebrewData = await hebrewResponse.json();

    // Try to fetch English version
    let englishData = null;
    try {
      const englishResponse = await fetch(`${SefariaApi.TEXT_ENDPOINT}/${encodedRef}?version=english`);
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
   * Extract reference from search result _id
   */
  private static extractReferenceFromId(id: string): string {
    // Remove the version information in parentheses
    const cleanId = id.replace(/\s*\([^)]*\)\s*$/, "");
    return cleanId;
  }

  /**
   * Search for texts and group by category
   */
  static async searchWithCategories(query: string): Promise<CategoryGroup[]> {
    if (!query.trim()) {
      return [];
    }

    // Fetch a larger set of results to get good category distribution
    const response = await SefariaApi.search(query, SefariaApi.CATEGORY_SEARCH_SIZE);
    const results = response.hits.hits;

    if (results.length === 0) {
      return [];
    }

    // Group results by primary category
    const categoryMap = new Map<string, SearchResult[]>();

    // We'll need to fetch text metadata for each result to get category info
    // For now, let's batch the requests to avoid overwhelming the API
    const batchSize = 10;
    const batches = [];

    for (let i = 0; i < results.length; i += batchSize) {
      batches.push(results.slice(i, i + batchSize));
    }

    // Process each batch
    for (const batch of batches) {
      const promises = batch.map(async (result) => {
        try {
          const reference = SefariaApi.extractReferenceFromId(result._id);
          const textData = await SefariaApi.getText(reference);
          const primaryCategory = textData.hebrew.primary_category || "Other";

          if (!categoryMap.has(primaryCategory)) {
            categoryMap.set(primaryCategory, []);
          }
          categoryMap.get(primaryCategory)!.push(result);
        } catch (error) {
          // If we can't fetch text data, categorize as 'Other'
          console.warn(`Failed to fetch category for ${result._id}:`, error);
          if (!categoryMap.has("Other")) {
            categoryMap.set("Other", []);
          }
          categoryMap.get("Other")!.push(result);
        }
      });

      // Wait for current batch to complete before processing next batch
      await Promise.all(promises);
    }

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
