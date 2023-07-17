import { SwiftPackageIndexSearchResult } from "./swift-package-index-search-result.model";

/**
 * Swift Package Index Search Results
 */
export interface SwiftPackageIndexSearchResults {
  /**
   * The Swift Package Index Search Results
   */
  results: SwiftPackageIndexSearchResult[];
  /**
   * The next page, if available
   */
  nextPage?: number;
}
