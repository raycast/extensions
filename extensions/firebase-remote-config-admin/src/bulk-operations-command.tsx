import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { BulkOperationForm } from "./bulk-operation-form";
import ManageProjectsCommand from "./manage-projects";
import { getGroups, getProjects } from "./storage";

async function loadRegistry() {
  const [projects, groups] = await Promise.all([getProjects(), getGroups()]);
  return { projects: projects.filter((project) => project.enabled), groups };
}

export default function BulkOperationsCommand() {
  const { data, isLoading, revalidate } = useCachedPromise(loadRegistry, [], {
    keepPreviousData: true,
  });

  if (!data || data.projects.length === 0) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView
          icon={Icon.PlusCircle}
          title="No projects available"
          description="Add a Firebase project first. Open Manage Projects to get started."
          actions={
            <ActionPanel>
              <Action.Push
                title="Manage Projects"
                icon={Icon.Gear}
                target={<ManageProjectsCommand />}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <BulkOperationForm
      availableProjects={data.projects}
      groups={data.groups}
      onCompleted={revalidate}
    />
  );
}
