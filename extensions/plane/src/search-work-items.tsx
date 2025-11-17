import { List } from "@raycast/api";
import { useState } from "react";

import { useWorkItems } from "./hooks/useWorkItems";
import WorkItemListItem from "./components/WorkItemListItem";
import AuthorizedView from "./components/AuthorizedView";
import { useProjects } from "./hooks/useProjects";
import { getProjectIcon } from "./helpers/icons";

function SearchWorkItems() {
  const [query, setQuery] = useState("");
  const [projectId, setProjectId] = useState("");

  const { projects } = useProjects({});
  const { isLoading, workItems, mutate } = useWorkItems(query, projectId);

  const workItemsSectionSubtitle = workItems?.length === 1 ? "1 work item" : `${workItems?.length} work items`;

  return (
    <List
      navigationTitle="Search work items"
      isLoading={isLoading}
      onSearchTextChange={setQuery}
      throttle
      searchBarPlaceholder="Globally search work items across projects"
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
      <List.EmptyView title={!query ? "Search for work items" : "No work items found"} />
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
