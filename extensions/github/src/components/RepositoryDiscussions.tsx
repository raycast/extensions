import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";

import { DiscussionFieldsFragment } from "../generated/graphql";
import { getGitHubClient } from "../helpers/withGithubClient";

import { DiscussionListItem } from "./DiscussionListItem";

export function RepositoryDiscussionList(props: { repository: string }): JSX.Element {
  const { github } = getGitHubClient();
  const [searchText, setSearchText] = useState("");
  const repoFilter = props.repository && props.repository.length > 0 ? `repo:${props.repository}` : "";
  const { data, isLoading } = usePromise(
    async (searchText) => {
      const result = await github.searchDiscussions({
        query: `${repoFilter} ${searchText}`,
        numberOfOpenItems: 20,
        avatarSize: 64,
      });
      return result.searchDiscussions.nodes?.map((d) => d as DiscussionFieldsFragment);
    },
    [searchText]
  );

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} navigationTitle={props.repository} throttle>
      <List.Section title="Discussions" subtitle={`${data?.length}`}>
        {data?.map((d) => (
          <DiscussionListItem key={d.id} discussion={d} />
        ))}
      </List.Section>
    </List>
  );
}
