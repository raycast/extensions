import fetch from "node-fetch";
import { AppleDeveloperDocumentationEntry } from "../models/apple-developer-documentation/apple-developer-documentation-entry.model";
import { URL } from "url";

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
    // Initialize URL
    const url = new URL(AppleDeveloperDocumentationService.hostUrl);
    url.pathname = "search/search_data.php";
    url.searchParams.append("q", query);
    url.searchParams.append("results", "500");
    // Fetch Documentation Response
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        // Important search_data endpoint requires a refer HTTP header
        Referer: AppleDeveloperDocumentationService.hostUrl,
      },
      signal: abortSignal as any,
    });
    // Retrieve search response as JSON
    const searchResponse = (await response.json()) as AppleDeveloperDocumentationSearchResponse;
    // Initialize Documentation Entries
    const entries = searchResponse.results ?? [];
    // For each Entry
    for (const entry of entries) {
      // Update URL
      entry.url = [AppleDeveloperDocumentationService.hostUrl, entry.url].join(entry.url.startsWith("/") ? "" : "/");
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
