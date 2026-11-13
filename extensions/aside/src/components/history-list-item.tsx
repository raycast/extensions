import { ActionPanel, Icon, List } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import type { HistoryEntry } from "../lib/types";
import { extractDomain } from "../lib/url";
import { OpenInDefaultBrowserAction, OpenInNewTabAction, RefreshAction, UrlActions } from "./actions";

interface HistoryListItemProps {
  entry: HistoryEntry;
  revalidate: () => Promise<unknown>;
}

export function HistoryListItem({ entry, revalidate }: HistoryListItemProps) {
  return (
    <List.Item
      id={entry.id}
      icon={getFavicon(entry.url, { fallback: Icon.Clock })}
      title={entry.title}
      subtitle={extractDomain(entry.url)}
      accessories={[{ text: new Date(entry.lastVisitedAt).toLocaleDateString() }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenInNewTabAction url={entry.url} />
            <OpenInDefaultBrowserAction url={entry.url} />
          </ActionPanel.Section>
          <UrlActions url={entry.url} title={entry.title} />
          <ActionPanel.Section>
            <RefreshAction subject="History" revalidate={revalidate} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
