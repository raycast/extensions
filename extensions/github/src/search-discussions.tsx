import { getPreferenceValues, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { trim } from "lodash";
import { useState } from "react";

import { DiscussionListItem } from "./components/DiscussionListItem";
import SearchRepositoryDropdown from "./components/SearchRepositoryDropdown";
import { DiscussionFieldsFragment } from "./generated/graphql";
import { DISCUSSION_DEFAULT_SORT_QUERY, formatDateForQuery } from "./helpers/discussion";
import { withGitHubClient } from "./helpers/withGithubClient";
import { useDiscussions } from "./hooks/useDiscussions";

function DiscussionList(): JSX.Element {
  const { defaultSearchTerms } = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState<string>(trim(defaultSearchTerms) + " ");
  const [searchFilter, setSearchFilter] = useState<string | null>(null);
  const [sortQuery, setSortQuery] = useCachedState<string>("sort-query", DISCUSSION_DEFAULT_SORT_QUERY, {
    cacheNamespace: "github-search-discussion",
  });
  const { data, isLoading } = useDiscussions(`${searchFilter} ${formatDateForQuery(sortQuery)} ${searchText}`);
  const discussions = data?.nodes as DiscussionFieldsFragment[] | null | undefined;
  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchText={searchText}
      searchBarAccessory={<SearchRepositoryDropdown onFilterChange={setSearchFilter} />}
      throttle
    >
      <List.Section
        title={searchText.length > 0 ? "Found Discussions" : "Recent Discussions"}
        subtitle={`${discussions?.length}`}
      >
        {discussions?.map((d) => <DiscussionListItem key={d.id} discussion={d} {...{ sortQuery, setSortQuery }} />)}
      </List.Section>
    </List>
  );
}

export default withGitHubClient(DiscussionList);
