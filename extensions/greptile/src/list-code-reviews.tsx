import { List } from "@raycast/api";
import { useMemo, useState } from "react";

import { CodeReviewListItem } from "./components/CodeReviewListItem";
import { ErrorDetail } from "./components/ErrorDetail";
import {
  LOAD_MORE_ITEM_ID,
  LoadMoreListItem,
} from "./components/LoadMoreListItem";
import { PAGE_SIZE } from "./constants";
import { useCodeReviews } from "./hooks/useGreptile";
import { CodeReviewStatus } from "./types";

type StatusFilter = CodeReviewStatus | "all";

export default function Command() {
  const [status, setStatus] = useState<StatusFilter>("all");
  const input = useMemo(
    () => ({
      status: status === "all" ? undefined : status,
      limit: PAGE_SIZE,
    }),
    [status],
  );
  const { codeReviews, error, hasMore, isLoading, isLoadingMore, loadMore } =
    useCodeReviews(input);

  if (error) {
    return <ErrorDetail error={error} />;
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Code Reviews"
      searchBarPlaceholder="Filter reviews by PR title, repository, status, or review ID"
      onSelectionChange={(id) => {
        if (id === LOAD_MORE_ITEM_ID) {
          loadMore();
        }
      }}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Status"
          value={status}
          onChange={(value) => setStatus(value as StatusFilter)}
        >
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="Pending" value="PENDING" />
          <List.Dropdown.Item title="Reviewing Files" value="REVIEWING_FILES" />
          <List.Dropdown.Item
            title="Generating Summary"
            value="GENERATING_SUMMARY"
          />
          <List.Dropdown.Item title="Completed" value="COMPLETED" />
          <List.Dropdown.Item title="Failed" value="FAILED" />
          <List.Dropdown.Item title="Skipped" value="SKIPPED" />
        </List.Dropdown>
      }
    >
      <List.Section
        title="Code Reviews"
        subtitle={formatLoaded(codeReviews.length)}
      >
        {codeReviews.map((review) => (
          <CodeReviewListItem key={review.id} review={review} />
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
