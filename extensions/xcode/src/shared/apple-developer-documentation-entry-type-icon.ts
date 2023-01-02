import { AppleDeveloperDocumentationEntryType } from "../models/apple-developer-documentation/apple-developer-documentation-entry-type.model";
import { Icon } from "@raycast/api";

/**
 * Retrieve icon for an Apple Developer Documentation Entry Type
 * @param appleDeveloperDocumentationEntryType The Apple Developer Documentation Entry Type
 */
export function AppleDeveloperDocumentationEntryTypeIcon(
  appleDeveloperDocumentationEntryType: AppleDeveloperDocumentationEntryType
): Icon {
  switch (appleDeveloperDocumentationEntryType) {
    case AppleDeveloperDocumentationEntryType.general:
      return Icon.Window;
    case AppleDeveloperDocumentationEntryType.documentation:
      return Icon.BlankDocument;
    case AppleDeveloperDocumentationEntryType.video:
      return Icon.Video;
    case AppleDeveloperDocumentationEntryType.sampleCode:
      return Icon.Download;
    case AppleDeveloperDocumentationEntryType.forums:
      return Icon.TwoPeople;
    default:
      return Icon.BlankDocument;
  }
}
