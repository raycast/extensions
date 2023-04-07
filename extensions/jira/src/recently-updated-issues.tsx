import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";

import { getIssues } from "./api/issues";
import { IssueListEmptyView } from "./components/IssueListEmptyView";
import IssueListFallback from "./components/IssueListFallback";
import IssueListItem from "./components/IssueListItem";
import { withJiraCredentials } from "./helpers/withJiraCredentials";

export function RecentlyUpdatedIssues() {
  const [query, setQuery] = useState("");

  const showFallbackCommand = query.length > 0;

  const {
    data: issues,
    isLoading,
    mutate,
  } = useCachedPromise(() => getIssues({ jql: "updated >= -1w ORDER BY updated DESC" }));

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter by key, summary, status, type, assignee or priority"
      searchText={query}
      onSearchTextChange={setQuery}
      filtering={{ keepSectionOrder: true }}
    >
      <List.Section
        title="Updated Recently"
        subtitle={issues && issues.length > 1 ? `${issues.length} issues` : "1 issue"}
      >
        {issues?.map((issue) => {
          return <IssueListItem key={issue.id} issue={issue} mutate={mutate} />;
        })}
      </List.Section>

      {showFallbackCommand ? <IssueListFallback query={query} /> : null}

      <IssueListEmptyView />
    </List>
  );
}

export default function Command() {
  return withJiraCredentials(<RecentlyUpdatedIssues />);
}
