/**
 * Xcode Swift Package Resolved Entry
 */
export interface XcodeSwiftPackageResolvedEntry {
  /**
   * The name
   */
  name: string;
  /**
   * The location / repository url
   */
  location: string;
  /**
   * The optional branch name
   */
  branch?: string;
  /**
   * The optional revision
   */
  revision?: string;
  /**
   * The optional version
   */
  version?: string;
}
