import fetch from "node-fetch";
import { SwiftPackageIndexSearchResults } from "../models/swift-package-index/swift-package-index-search-results.model";
import Path from "path";
import { URL } from "url";

/**
 * SwiftPackageIndexService
 */
export class SwiftPackageIndexService {
  /**
   * The Swift Package Index Host URL
   */
  private static hostUrl = "https://swiftpackageindex.com";

  /**
   * The GitHub Host URL
   */
  private static gitHubHostUrl = "https://github.com";

  /**
   * Search Swift Package Index
   * @param query The search query
   * @param page The page. Default value `1`
   * @param abortSignal The optional AbortSignal
   */
  static async search(query: string, page = 1, abortSignal?: AbortSignal): Promise<SwiftPackageIndexSearchResults> {
    // Check if query is falsely
    if (!query) {
      // Return empty results
      return {
        results: [],
      };
    }
    // Initialize URL
    const url = new URL(SwiftPackageIndexService.hostUrl);
    url.pathname = "api/search";
    url.searchParams.append("query", query);
    url.searchParams.append("page", String(page));
    // Search Swift Package Index
    const response = await fetch(url.toString(), { method: "GET", signal: abortSignal as any });
    // Check if response is not ok
    if (!response.ok) {
      // Throw error
      return Promise.reject(response.statusText);
    }
    // Retrieve Swift Package Index Response
    const swiftPackageIndexResponse = (await response.json()) as SwiftPackageIndexResponse;
    // Return Swift Package Index Search Results
    return {
      results: swiftPackageIndexResponse.results
        .filter((result) => result.package)
        .map((result) => result.package._0)
        .map((swiftPackage) => {
          return {
            id: swiftPackage.packageId,
            name: swiftPackage.packageName ?? swiftPackage.repositoryName,
            description: swiftPackage.summary,
            author: swiftPackage.repositoryOwner,
            stars: swiftPackage.stars,
            url: Path.join(
              SwiftPackageIndexService.gitHubHostUrl,
              swiftPackage.repositoryOwner,
              swiftPackage.repositoryName
            ),
            lastActivityAt: swiftPackage.lastActivityAt ? new Date(swiftPackage.lastActivityAt) : undefined,
          };
        }),
      nextPage: swiftPackageIndexResponse.hasMoreResults ? page + 1 : undefined,
    };
  }
}

/**
 * Swift Package Index Response
 */
interface SwiftPackageIndexResponse {
  hasMoreResults: boolean;
  results: {
    package: {
      _0: {
        packageId: string;
        packageName?: string;
        packageURL: string;
        summary?: string;
        repositoryName: string;
        repositoryOwner: string;
        stars: number;
        lastActivityAt?: string;
      };
    };
  }[];
}
