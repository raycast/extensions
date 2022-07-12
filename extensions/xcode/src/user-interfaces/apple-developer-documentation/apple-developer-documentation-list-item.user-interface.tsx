import { AppleDeveloperDocumentationEntry } from "../../models/apple-developer-documentation/apple-developer-documentation-entry.model";
import { Action, ActionPanel, Icon, List } from "@raycast/api";

/**
 * Apple Developer Documentation List Item
 * @param appleDeveloperDocumentationEntry The AppleDeveloperDocumentationEntry
 */
export function appleDeveloperDocumentationListItem(
  appleDeveloperDocumentationEntry: AppleDeveloperDocumentationEntry
): JSX.Element {
  return (
    <List.Item
      key={appleDeveloperDocumentationEntry.url}
      icon={icon(appleDeveloperDocumentationEntry)}
      title={appleDeveloperDocumentationEntry.title}
      subtitle={appleDeveloperDocumentationEntry.description}
      accessories={[{ text: appleDeveloperDocumentationEntry.platform.at(0) }]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Browser" icon={Icon.Globe} url={appleDeveloperDocumentationEntry.url} />
          <Action.CopyToClipboard content={appleDeveloperDocumentationEntry.url} />
        </ActionPanel>
      }
    />
  );
}

/**
 * Retrieve icon for AppleDeveloperDocumentationEntry
 * @param appleDeveloperDocumentationEntry The AppleDeveloperDocumentationEntry
 */
function icon(appleDeveloperDocumentationEntry: AppleDeveloperDocumentationEntry): Icon | undefined {
  switch (appleDeveloperDocumentationEntry.type) {
    case "General":
      return Icon.Window;
    case "video":
      return Icon.Video;
    case "sample_code":
      return Icon.Download;
    default:
      return Icon.TextDocument;
  }
}
