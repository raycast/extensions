import { Icon, List } from "@raycast/api";
import { useState } from "react";

import { useWorkItems } from "./hooks/useWorkItems";
import WorkItemListItem from "./components/WorkItemListItem";
import AuthorizedView from "./components/AuthorizedView";
import { useProjects } from "./hooks/useProjects";
import { getProjectIcon } from "./helpers/icons";
import ErrorEmptyView from "./components/ErrorEmptyView";

function SearchWorkItems() {
  const [query, setQuery] = useState("");
  const [projectId, setProjectId] = useState("");

  const { projects } = useProjects({});
  const { isLoading, workItems, error, mutate, revalidate } = useWorkItems(query, projectId);
  const hasQuery = query.trim().length > 0;

  const workItemsSectionSubtitle = workItems?.length === 1 ? "1 work item" : `${workItems?.length} work items`;

  return (
    <List
      navigationTitle="Search work items"
      isLoading={isLoading}
      onSearchTextChange={setQuery}
      throttle
      searchBarPlaceholder="Search work items by title or ID (e.g. ENG-123)"
      searchBarAccessory={
        <List.Dropdown tooltip="Select Project" onChange={setProjectId}>
          <List.Dropdown.Item title="All Projects" value="" />
          <List.Dropdown.Section>
            {projects.map((project) =>
              !project.id ? undefined : (
                <List.Dropdown.Item
                  key={project.identifier}
                  icon={getProjectIcon(project.logoProps)}
                  title={project.name}
                  value={project.id}
                />
              ),
            )}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {error && hasQuery ? (
        <ErrorEmptyView error={error} onRetry={revalidate} />
      ) : (
        <List.EmptyView
          icon={hasQuery ? Icon.MagnifyingGlass : Icon.BullsEye}
          title={hasQuery ? "No work items found" : "Search for work items"}
          description={
            hasQuery
              ? "Plane matches titles, sequence numbers, and project identifiers."
              : "Type a title or an ID such as ENG-123."
          }
        />
      )}
      <List.Section title="Work Items" subtitle={workItemsSectionSubtitle}>
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
