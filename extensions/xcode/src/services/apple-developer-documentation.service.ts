import fetch from "node-fetch";
import { AppleDeveloperDocumentationEntry } from "../models/apple-developer-documentation/apple-developer-documentation-entry.model";
import { joinPathComponents } from "../shared/join-path-components";

/**
 * AppleDeveloperDocumentationService
 */
export class AppleDeveloperDocumentationService {
  /**
   * The host URL
   */
  private hostUrl = "https://developer.apple.com";

  /**
   * Search Developer Documentation by search text
   * @param searchText The search text
   */
  async search(searchText: string): Promise<AppleDeveloperDocumentationEntry[]> {
    // Fetch Documentation Response
    const response = await fetch(
      joinPathComponents(
        this.hostUrl,
        `/search/search_data.php?q=${encodeURIComponent(searchText)}&results=500&group=documentation`
      ),
      {
        method: "GET",
        headers: {
          // Important search_data endpoint requires
          // an refer HTTP header
          Referer: this.hostUrl,
        },
      }
    );
    // Retrieve search response as JSON
    const searchResponse = (await response.json()) as AppleDeveloperDocumentationSearchResponse;
    // Initialize Documentation Entries
    const entries = searchResponse.results ?? [];
    // For each Entry
    for (const entry of entries) {
      // Update URL
      entry.url = joinPathComponents(this.hostUrl, entry.url);
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
