import { List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import type { JSX } from "react";
import { useState } from "react";

import { DiscussionListItem } from "./components/DiscussionListItem";
import { DiscussionFieldsFragment } from "./generated/graphql";
import { uniqueById } from "./helpers";
import { DISCUSSION_DEFAULT_SORT_QUERY, formatDateForQuery } from "./helpers/discussion";
import { withGitHubClient } from "./helpers/withGithubClient";
import { useDiscussions } from "./hooks/useDiscussions";

function DiscussionList(): JSX.Element {
  const [searchText, setSearchText] = useState<string>("");
  const [sortQuery, setSortQuery] = useCachedState<string>("sort-query", DISCUSSION_DEFAULT_SORT_QUERY, {
    cacheNamespace: "github-my-discussion",
  });
  const { data, isLoading, pagination } = useDiscussions(`author:@me ${formatDateForQuery(sortQuery)} ${searchText}`);
  const discussions = uniqueById((data ?? []) as DiscussionFieldsFragment[]);
  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} throttle pagination={pagination}>
      <List.Section
        title={searchText.length > 0 ? "Found Discussions" : "Your Discussions"}
        subtitle={`${discussions.length}`}
      >
        {discussions.map((d) => (
          <DiscussionListItem key={d.id} discussion={d} {...{ sortQuery, setSortQuery }} />
        ))}
      </List.Section>
    </List>
  );
}

export default withGitHubClient(DiscussionList);
