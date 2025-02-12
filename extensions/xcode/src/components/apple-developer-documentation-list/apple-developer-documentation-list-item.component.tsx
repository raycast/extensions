import { AppleDeveloperDocumentationEntry } from "../../models/apple-developer-documentation/apple-developer-documentation-entry.model";
import { Action, ActionPanel, List } from "@raycast/api";
import { AppleDeveloperDocumentationListItemDetail } from "./apple-developer-documentation-list-item-detail.component";
import { AppleDeveloperDocumentationEntryTypeIcon } from "../../shared/apple-developer-documentation-entry-type-icon";

/**
 * Apple Developer Documentation List Item
 */
export function AppleDeveloperDocumentationListItem(props: { entry: AppleDeveloperDocumentationEntry }) {
  return (
    <List.Item
      icon={AppleDeveloperDocumentationEntryTypeIcon(props.entry.type)}
      title={props.entry.title}
      detail={<AppleDeveloperDocumentationListItemDetail entry={props.entry} />}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={props.entry.url} />
          <Action.CopyToClipboard content={props.entry.url} />
        </ActionPanel>
      }
    />
  );
}
