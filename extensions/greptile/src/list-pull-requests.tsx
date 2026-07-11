import { List } from "@raycast/api";
import { useMemo, useState } from "react";

import {
  LOAD_MORE_ITEM_ID,
  LoadMoreListItem,
} from "./components/LoadMoreListItem";
import { PullRequestListItem } from "./components/PullRequestListItem";
import { ErrorDetail } from "./components/ErrorDetail";
import { PAGE_SIZE } from "./constants";
import { usePullRequests } from "./hooks/useGreptile";
import { PullRequestState } from "./types";

type StateFilter = PullRequestState | "all";

export default function Command() {
  const [state, setState] = useState<StateFilter>("open");
  const input = useMemo(
    () => ({
      state: state === "all" ? undefined : state,
      limit: PAGE_SIZE,
    }),
    [state],
  );
  const { pullRequests, error, hasMore, isLoading, isLoadingMore, loadMore } =
    usePullRequests(input);

  if (error) {
    return <ErrorDetail error={error} />;
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Pull Requests"
      searchBarPlaceholder="Filter pull requests by title, repository, author, or number"
      onSelectionChange={(id) => {
        if (id === LOAD_MORE_ITEM_ID) {
          loadMore();
        }
      }}
      searchBarAccessory={
        <List.Dropdown
          tooltip="State"
          value={state}
          onChange={(value) => setState(value as StateFilter)}
        >
          <List.Dropdown.Item title="Open" value="open" />
          <List.Dropdown.Item title="Merged" value="merged" />
          <List.Dropdown.Item title="Closed" value="closed" />
          <List.Dropdown.Item title="All" value="all" />
        </List.Dropdown>
      }
    >
      <List.Section
        title="Pull Requests"
        subtitle={formatLoaded(pullRequests.length)}
      >
        {pullRequests.map((pullRequest) => (
          <PullRequestListItem key={pullRequest.id} pullRequest={pullRequest} />
        ))}
        {hasMore ? (
          <LoadMoreListItem isLoading={isLoadingMore} onLoadMore={loadMore} />
        ) : null}
      </List.Section>
    </List>
  );
}

function formatLoaded(visible: number) {
  return `${visible} loaded`;
}
