import fetch from "node-fetch";
import * as Path from "path";
import { AppleDeveloperDocumentationEntry } from "../models/apple-developer-documentation/apple-developer-documentation-entry.model";

/**
 * AppleDeveloperDocumentationService
 */
export class AppleDeveloperDocumentationService {
  /**
   * The host URL
   */
  private static hostUrl = "https://developer.apple.com";
  /**
   * Search Developer Documentation
   * @param query The search query
   * @param abortSignal The optional AbortSignal
   */
  static async search(query: string, abortSignal?: AbortSignal): Promise<AppleDeveloperDocumentationEntry[]> {
    // Check if query is falsely
    if (!query) {
      // Return empty results
      return [];
    }
    // Fetch Documentation Response
    const response = await fetch(
      Path.join(
        AppleDeveloperDocumentationService.hostUrl,
        `/search/search_data.php?q=${encodeURIComponent(query)}&results=500&group=documentation`
      ),
      {
        method: "GET",
        headers: {
          // Important search_data endpoint requires a refer HTTP header
          Referer: AppleDeveloperDocumentationService.hostUrl,
        },
        signal: abortSignal as any,
      }
    );
    // Retrieve search response as JSON
    const searchResponse = (await response.json()) as AppleDeveloperDocumentationSearchResponse;
    // Initialize Documentation Entries
    const entries = searchResponse.results ?? [];
    // For each Entry
    for (const entry of entries) {
      // Update URL
      entry.url = Path.join(AppleDeveloperDocumentationService.hostUrl, entry.url);
    }
    // Return Documentation Entries
    return entries;
  }
}

/**
 * The Apple Developer Documentation Search Response
 */
interface AppleDeveloperDocumentationSearchResponse {
  /**
   * The Apple Developer Documentation Entries
   */
  readonly results: AppleDeveloperDocumentationEntry[];
}
