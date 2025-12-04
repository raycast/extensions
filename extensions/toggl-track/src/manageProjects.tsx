import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useMemo, useState } from "react";

import { Workspace, Project } from "@/api";
import ProjectForm from "@/components/ProjectForm";
import ProjectListItem from "@/components/ProjectListItem";
import { canModifyProjectIn } from "@/helpers/privileges";
import Shortcut from "@/helpers/shortcuts";
import { useOrganizations, useWorkspaces, useProjects, useGroups, useClients } from "@/hooks";

export default function ProjectList() {
  const { organizations, isLoadingOrganizations } = useOrganizations();
  const { workspaces, isLoadingWorkspaces } = useWorkspaces();
  const { projects, isLoadingProjects, revalidateProjects } = useProjects();
  const { clients, isLoadingClients } = useClients();

  const [statusVisibily, setStatusVisibilty] = useCachedState("projectVisibilyByStatus", statusVisibilyDefault);
  const [searchFilter, setSearchFilter] = useState<Workspace>();
  const [isShowingDetail, setIsShowingDetail] = useState(false);

  const filteredProjects = useMemo(
    () => projects.filter((project) => statusVisibily[project.status]),
    [projects, statusVisibily],
  );
  const groupedProjects = useGroups(filteredProjects, "workspace_id");

  const isLoading = isLoadingOrganizations || isLoadingWorkspaces || isLoadingProjects || isLoadingClients;

  const projectAdminWorkspaces = workspaces.filter(canModifyProjectIn);
  const SharedActions = (
    <ActionPanel.Section>
      {projectAdminWorkspaces && (
        <Action.Push
          title="Create New Project"
          icon={Icon.Plus}
          shortcut={Shortcut.New}
          target={
            <ProjectForm
              workspaces={projectAdminWorkspaces}
              clients={clients}
              revalidateProjects={revalidateProjects}
            />
          }
        />
      )}
      <ActionPanel.Submenu title="Show/Hide Projects..." icon={Icon.Eye} shortcut={Shortcut.ShowOrHide}>
        {statuses.map((status) => {
          const isVisible = statusVisibily[status];
          const capitalized = status[0].toUpperCase() + status.slice(1);
          return (
            <Action
              key={status}
              title={`${isVisible ? "Hide" : "Show"} ${capitalized} Projects`}
              icon={isVisible ? Icon.Eye : Icon.EyeDisabled}
              onAction={() => setStatusVisibilty((obj) => ({ ...obj, [status]: !isVisible }))}
            />
          );
        })}
      </ActionPanel.Submenu>
    </ActionPanel.Section>
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      actions={<ActionPanel>{SharedActions}</ActionPanel>}
      searchBarAccessory={
        workspaces.length < 2 ? undefined : (
          <List.Dropdown
            tooltip="Filter Projects"
            onChange={(idStr) => setSearchFilter(idStr ? workspaces.find((w) => w.id.toString() === idStr) : undefined)}
          >
            <List.Dropdown.Item title="All" value="" />
            <List.Dropdown.Section>
              {workspaces.map((workspace) => (
                <List.Dropdown.Item key={workspace.id} title={workspace.name} value={workspace.id.toString()} />
              ))}
            </List.Dropdown.Section>
          </List.Dropdown>
        )
      }
    >
      {searchFilter ? (
        <>
          {groupedProjects[searchFilter.id]?.length == 0 && <List.EmptyView title="No Projects Found" />}
          <List.Section key={searchFilter.id} title={searchFilter.name}>
            {groupedProjects[searchFilter.id]?.map((project) => (
              <ProjectListItem
                key={project.id}
                organization={organizations.find((o) => o.id === searchFilter.organization_id)!}
                workspace={searchFilter}
                project={project}
                client={clients.find((c) => c.id === project.client_id)!}
                isLoading={isLoading}
                revalidateProjects={revalidateProjects}
                isShowingDetail={isShowingDetail}
                setIsShowingDetail={setIsShowingDetail}
                clients={clients}
                SharedActions={SharedActions}
              />
            ))}
          </List.Section>
        </>
      ) : (
        <>
          {filteredProjects.length == 0 && <List.EmptyView title="No Projects Found" />}
          {workspaces.map((workspace) => (
            <List.Section key={workspace.id} title={workspace.name}>
              {groupedProjects[workspace.id]?.map((project) => (
                <ProjectListItem
                  key={project.id}
                  organization={organizations.find((o) => o.id === workspace.organization_id)!}
                  workspace={workspace}
                  project={project}
                  client={clients.find((c) => c.id === project.client_id)!}
                  isLoading={isLoading}
                  revalidateProjects={revalidateProjects}
                  isShowingDetail={isShowingDetail}
                  setIsShowingDetail={setIsShowingDetail}
                  clients={clients}
                  SharedActions={SharedActions}
                />
              ))}
            </List.Section>
          ))}
        </>
      )}
    </List>
  );
}

type StatusVisibily = Record<Project["status"], boolean>;
const statusVisibilyDefault: StatusVisibily = {
  active: true,
  archived: false,
  ended: true,
  upcoming: true,
  deleted: false,
};
const statuses = ["active", "ended", "upcoming", "archived"] as const;
