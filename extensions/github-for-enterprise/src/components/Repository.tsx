import { ActionPanel, Color, List, Action, Image, Icon } from "@raycast/api";
import { format } from "timeago.js";
import { RepositoryOwnProps } from "@/types";

export default function Repository(props: RepositoryOwnProps) {
  const {
    id,
    name,
    nameWithOwner,
    url,
    description,
    updatedAt,
    visibility,
    isFork,
    isArchived,
    primaryLanguage,
    owner,
  } = props;

  const accessories: List.Item.Accessory[] = [];

  if (primaryLanguage) {
    accessories.push({
      tag: { value: primaryLanguage.name, color: primaryLanguage.color || Color.SecondaryText },
    });
  }

  if (visibility === "PRIVATE") {
    accessories.push({
      icon: { source: Icon.Lock, tintColor: Color.SecondaryText },
      tooltip: "Private",
    });
  } else if (visibility === "INTERNAL") {
    accessories.push({
      icon: { source: Icon.Lock, tintColor: Color.SecondaryText },
      tooltip: "Internal",
    });
  }

  if (isArchived) {
    accessories.push({
      icon: { source: Icon.Box, tintColor: Color.SecondaryText },
      tooltip: "Archived",
    });
  }

  accessories.push({
    text: format(updatedAt),
    icon: {
      source: owner.avatarUrl,
      mask: Image.Mask.Circle,
    },
  });

  return (
    <List.Item
      key={id}
      title={name}
      subtitle={description || undefined}
      icon={{
        source: isFork ? Icon.CodeBlock : Icon.Box,
        tintColor: Color.PrimaryText,
      }}
      accessories={accessories}
      actions={
        <ActionPanel title={nameWithOwner}>
          <ActionPanel.Section>
            <Action.OpenInBrowser url={url} />
            <Action.OpenInBrowser
              title="Open Issues"
              url={`${url}/issues`}
              shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
            />
            <Action.OpenInBrowser
              title="Open Pull Requests"
              url={`${url}/pulls`}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            />
            <Action.OpenInBrowser
              title="Open Actions"
              url={`${url}/actions`}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Repository Name"
              content={nameWithOwner}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
            <Action.CopyToClipboard
              title="Copy Repository URL"
              content={url}
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
