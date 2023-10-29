import { List } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { useState } from "react";

import { Issue } from "../api/issues";
import { getIssueListSections } from "../helpers/issues";

import { IssueListEmptyView } from "./IssueListEmptyView";
import IssueListFallback from "./IssueListFallback";
import IssueListItem from "./IssueListItem";

type StatusIssueListProps = {
  issues?: Issue[];
  isLoading: boolean;
  mutate: MutatePromise<Issue[] | undefined>;
  searchBarAccessory?: JSX.Element | null;
};

export default function StatusIssueList({ issues, isLoading, mutate, searchBarAccessory }: StatusIssueListProps) {
  const [query, setQuery] = useState("");

  const sections = getIssueListSections(issues);

  const showFallbackCommand = query.length > 0;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter by key, summary, status, type, assignee or priority"
      searchText={query}
      onSearchTextChange={setQuery}
      filtering={{ keepSectionOrder: true }}
      {...(searchBarAccessory ? { searchBarAccessory } : {})}
    >
      {sections.map((section) => {
        return (
          <List.Section key={section.key} title={section.title} subtitle={section.subtitle}>
            {section.issues.map((issue) => {
              if (!issue.fields.summary) {
                return null;
              }

              return <IssueListItem key={issue.id} issue={issue} mutate={mutate} />;
            })}
          </List.Section>
        );
      })}

      {showFallbackCommand ? <IssueListFallback query={query} /> : null}

      <IssueListEmptyView />
    </List>
  );
}
