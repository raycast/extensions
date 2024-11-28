import { List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useState } from "react";

import { DiscussionListItem } from "./components/DiscussionListItem";
import { DiscussionFieldsFragment } from "./generated/graphql";
import { DISCUSSION_DEFAULT_SORT_QUERY, formatDateForQuery } from "./helpers/discussion";
import { withGitHubClient } from "./helpers/withGithubClient";
import { useDiscussions } from "./hooks/useDiscussions";

function DiscussionList(): JSX.Element {
  const [searchText, setSearchText] = useState<string>("");
  const [sortQuery, setSortQuery] = useCachedState<string>("sort-query", DISCUSSION_DEFAULT_SORT_QUERY, {
    cacheNamespace: "github-my-discussion",
  });
  const { data, isLoading } = useDiscussions(`author:@me ${formatDateForQuery(sortQuery)} ${searchText}`);
  const discussions = data?.nodes as DiscussionFieldsFragment[] | null | undefined;
  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} throttle>
      <List.Section
        title={searchText.length > 0 ? "Found Discussions" : "Your Discussions"}
        subtitle={`${discussions?.length}`}
      >
        {discussions?.map((d) => <DiscussionListItem key={d.id} discussion={d} {...{ sortQuery, setSortQuery }} />)}
      </List.Section>
    </List>
  );
}

export default withGitHubClient(DiscussionList);
