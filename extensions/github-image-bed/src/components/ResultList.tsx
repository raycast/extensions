// @ts-nocheck - Raycast internal React types conflict with @types/react v18
import { List, ActionPanel, Action, Icon } from "@raycast/api";

interface ResultListProps {
  url: string;
}

/**
 * Shared result list showing URL in Markdown / URL / HTML formats
 */
export default function ResultList({ url }: ResultListProps) {
  const markdownUrl = `![](${url})`;
  const htmlUrl = `<img src="${url}" alt="" />`;

  return (
    <List>
      <List.Section title="Choose format to copy">
        <List.Item
          icon={Icon.Document}
          title="Markdown"
          subtitle={markdownUrl}
          accessories={[{ text: "![](url)" }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Markdown"
                content={markdownUrl}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Link}
          title="Direct URL"
          subtitle={url}
          accessories={[{ text: "https://..." }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy URL" content={url} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Code}
          title="HTML"
          subtitle={htmlUrl}
          accessories={[{ text: "<img>" }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Html" content={htmlUrl} />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Actions">
        <List.Item
          icon={Icon.Globe}
          title="Open in Browser"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={url} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
