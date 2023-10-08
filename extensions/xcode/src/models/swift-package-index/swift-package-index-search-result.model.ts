/**
 * A Swift Package Index Search Result
 */
export interface SwiftPackageIndexSearchResult {
  /**
   * The identifier
   */
  id: string;
  /**
   * The name
   */
  name: string;
  /**
   * The optional description
   */
  description?: string;
  /**
   * The name of the author
   */
  author: string;
  /**
   * The number of stars
   */
  stars: number;
  /**
   * The url
   */
  url: string;
  /**
   * The optional Date of the last activity
   */
  lastActivityAt?: Date;
}
