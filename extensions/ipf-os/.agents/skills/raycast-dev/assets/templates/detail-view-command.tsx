import { Action, ActionPanel, Color, Detail, Icon, open } from "@raycast/api";

interface DetailViewProps {
  id: string;
  title: string;
  status: "open" | "in_progress" | "resolved";
  author: string;
  url: string;
  content: string;
}

export default function DetailCommand(props: { item?: DetailViewProps }) {
  const item: DetailViewProps = props.item ?? {
    id: "TSK-891",
    title: "Implement OAuth PKCE flow",
    status: "in_progress",
    author: "Joseph Emmanuel",
    url: "https://linear.app",
    content: `
# Implement OAuth PKCE Flow

Ensure secure authorization code exchange with standard PKCE verification.

### Scope
- [x] Configure PKCE client with Web redirect method
- [x] Register OAuthService handler
- [ ] Add token refresh retry strategy
    `.trim(),
  };

  const statusColorMap = {
    open: Color.Blue,
    in_progress: Color.Orange,
    resolved: Color.Green,
  };

  return (
    <Detail
      navigationTitle={`Item #${item.id}`}
      markdown={item.content}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Issue ID" text={item.id} />
          <Detail.Metadata.Label title="Assignee" text={item.author} />
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item
              text={item.status.replace("_", " ").toUpperCase()}
              color={statusColorMap[item.status]}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="External Link" target={item.url} text="Open in Web" />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={item.url} />
          <Action.CopyToClipboard title="Copy Markdown" content={item.content} />
          <Action
            title="Open Web Dashboard"
            icon={Icon.Globe}
            shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
            onAction={() => open(item.url)}
          />
        </ActionPanel>
      }
    />
  );
}
