import { AppleDeveloperDocumentationEntryType } from "../models/apple-developer-documentation/apple-developer-documentation-entry-type.model";

/**
 * Retrieve name for an Apple Developer Documentation Entry Type
 * @param appleDeveloperDocumentationEntryType The Apple Developer Documentation Entry Type
 */
export function AppleDeveloperDocumentationEntryTypeName(
  appleDeveloperDocumentationEntryType: AppleDeveloperDocumentationEntryType
): string {
  switch (appleDeveloperDocumentationEntryType) {
    case AppleDeveloperDocumentationEntryType.general:
      return "General";
    case AppleDeveloperDocumentationEntryType.documentation:
      return "Documentation";
    case AppleDeveloperDocumentationEntryType.video:
      return "Video";
    case AppleDeveloperDocumentationEntryType.sampleCode:
      return "Sample code";
    case AppleDeveloperDocumentationEntryType.forums:
      return "Forums";
    default:
      return appleDeveloperDocumentationEntryType;
  }
}
