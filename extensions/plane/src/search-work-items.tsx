import { List } from "@raycast/api";
import { useState } from "react";

import { useWorkItems } from "./hooks/useWorkItems";
import WorkItemListItem from "./components/WorkItemListItem";
import AuthorizedView from "./components/AuthorizedView";

function SearchWorkItems() {
  const [query, setQuery] = useState("");

  const { isLoading, workItems, mutate } = useWorkItems(query);

  const numberOfIssues = workItems?.length === 1 ? "1 issue" : `${workItems?.length} issues`;

  return (
    <List
      navigationTitle="Search work items"
      isLoading={isLoading}
      onSearchTextChange={setQuery}
      throttle
      searchBarPlaceholder="Globally search work items across projects"
    >
      <List.EmptyView title={!query ? "Search for work items" : "No work items found"} />
      <List.Section title="Work Items" subtitle={numberOfIssues}>
        {workItems?.map((workItem) => (
          <WorkItemListItem workItem={workItem} key={workItem.id} mutateWorkItemList={mutate} />
        ))}
      </List.Section>
    </List>
  );
}

export default function Command() {
  return (
    <AuthorizedView>
      <SearchWorkItems />
    </AuthorizedView>
  );
}
