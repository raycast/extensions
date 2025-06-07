import { ActionPanel, List, Action, Icon, Image } from "@raycast/api";
import { PullRequest } from "../utils/github";

export interface PRLinkProps {
  pr: PullRequest;
}

export function PRLink({ pr }: PRLinkProps) {
  return (
    <List.Item
      key={pr.id}
      icon={{
        source: pr.user.avatar_url,
        mask: Image.Mask.Circle,
      }}
      title={pr.title}
      subtitle={pr.repository_name}
      accessories={[
        ...(pr.draft ? [{ icon: Icon.Pencil }] : []),
        {
          icon: Icon.SpeechBubble,
          text: `${pr.comments}`,
        },
        {
          date: new Date(pr.created_at),
          tooltip: `Created on ${new Date(pr.created_at).toLocaleDateString()}`,
        },
      ]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={pr.html_url} title="Open in Browser" />
          <Action.CopyToClipboard
            title="Copy to Clipboard"
            content={pr.html_url}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
