import { List, Icon, Color, ActionPanel, Action } from "@raycast/api";

import { DiscussionFieldsFragment } from "../generated/graphql";

export function DiscussionListItem(props: { discussion: DiscussionFieldsFragment }): JSX.Element {
  const d = props.discussion;
  return (
    <List.Item
      icon={d.repository.owner.avatarUrl}
      title={d.title}
      subtitle={d.repository?.nameWithOwner}
      accessories={[
        {
          icon: { source: d.answer ? Icon.Checkmark : "", tintColor: Color.Green },
          tooltip: d.answer ? "Answered" : undefined,
        },
        { date: new Date(d.publishedAt) },
      ]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={d.url} />
        </ActionPanel>
      }
    />
  );
}
