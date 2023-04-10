import { AppleDeveloperDocumentationEntryType } from "./apple-developer-documentation-entry-type.model";

/**
 * Apple Developer Documentation Entry
 */
export interface AppleDeveloperDocumentationEntry {
  /**
   * The title
   */
  title: string;
  /**
   * The description
   */
  description: string;
  /**
   * The type
   */
  type: AppleDeveloperDocumentationEntryType;
  /**
   * The platforms
   */
  platform: string[];
  /**
   * The url
   */
  url: string;
}
