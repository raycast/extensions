import { AppleDeveloperDocumentationEntry } from "../../models/apple-developer-documentation/apple-developer-documentation-entry.model";
import { Action, ActionPanel, Icon, List } from "@raycast/api";

/**
 * Apple Developer Documentation List Item
 */
export function AppleDeveloperDocumentationListItem(props: { entry: AppleDeveloperDocumentationEntry }): JSX.Element {
  return (
    <List.Item
      key={props.entry.url}
      icon={icon(props.entry)}
      title={props.entry.title}
      subtitle={props.entry.description}
      accessories={[{ text: props.entry.platform.at(0) }]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Browser" icon={Icon.Globe} url={props.entry.url} />
          <Action.CopyToClipboard content={props.entry.url} />
        </ActionPanel>
      }
    />
  );
}

/**
 * Retrieve icon for AppleDeveloperDocumentationEntry
 * @param appleDeveloperDocumentationEntry The AppleDeveloperDocumentationEntry
 */
function icon(appleDeveloperDocumentationEntry: AppleDeveloperDocumentationEntry): Icon {
  switch (appleDeveloperDocumentationEntry.type) {
    case "General":
      return Icon.Window;
    case "video":
      return Icon.Video;
    case "sample_code":
      return Icon.Download;
    default:
      return Icon.BlankDocument;
  }
}
