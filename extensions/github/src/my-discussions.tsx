import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useState } from "react";

import View from "./components/View";
import { DiscussionFieldsFragment } from "./generated/graphql";
import { useDiscussions } from "./hooks/useDiscussions";

function DiscussionListItem(props: { discussion: DiscussionFieldsFragment }): JSX.Element {
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

function DiscussionList(): JSX.Element {
  const [searchText, setSearchText] = useState<string>("");
  const { data, isLoading } = useDiscussions(`author:@me ${searchText}`);
  const discussions = data?.nodes as DiscussionFieldsFragment[] | null | undefined;
  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} throttle>
      <List.Section
        title={searchText.length > 0 ? "Found Discussions" : "Your Discussions"}
        subtitle={`${discussions?.length}`}
      >
        {discussions?.map((d) => (
          <DiscussionListItem key={d.id} discussion={d} />
        ))}
      </List.Section>
    </List>
  );
}

export default function Command() {
  return (
    <View>
      <DiscussionList />
    </View>
  );
}
