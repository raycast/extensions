import { Action, ActionPanel, Icon } from "@raycast/api";
import type { ContentfulEntry } from "../types/contentful";

type EntryActionsProps = {
  entry: ContentfulEntry;
};

/**
 * Action panel for Contentful entry operations
 * Provides actions for opening in browser, copying ID and URL
 */
export function EntryActions({ entry }: EntryActionsProps) {
  return (
    <ActionPanel>
      <ActionPanel.Section title="Entry Actions">
        <Action.OpenInBrowser
          icon={Icon.Globe}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          title="Open in Contentful"
          url={entry.url}
        />
        <Action.CopyToClipboard
          content={entry.id}
          icon={Icon.Clipboard}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
          title="Copy Entry ID"
        />
        <Action.CopyToClipboard
          content={entry.url}
          icon={Icon.Link}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          title="Copy Entry URL"
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Entry Information">
        <Action.CopyToClipboard
          content={entry.spaceId}
          icon={Icon.Box}
          shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
          title="Copy Space ID"
        />
        <Action.CopyToClipboard
          content={entry.contentTypeId}
          icon={Icon.Tag}
          shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
          title="Copy Content Type"
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
