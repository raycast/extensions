import { List, ActionPanel, Action, Icon, Color, confirmAlert, Alert } from "@raycast/api";
import dayjs from "dayjs";
import { Dispatch, SetStateAction } from "react";

import { Organization, Workspace, Project, Client, updateProject, deleteProject } from "@/api";
import ProjectForm from "@/components/ProjectForm";
import { formatSeconds } from "@/helpers/formatSeconds";
import { canModifyProjectIn } from "@/helpers/privileges";
import Shortcut from "@/helpers/shortcuts";
import { withToast, Verb } from "@/helpers/withToast";

interface ProjectListProps {
  organization: Organization;
  workspace: Workspace;
  project: Project;
  client: Client;
  isLoading: boolean;
  revalidateProjects: () => void;
  isShowingDetail: boolean;
  setIsShowingDetail: Dispatch<SetStateAction<boolean>>;
  clients: Client[];
  SharedActions: React.ReactNode;
}

export default function ProjectListItem({
  organization,
  workspace,
  project,
  client,
  isLoading,
  revalidateProjects,
  isShowingDetail,
  setIsShowingDetail,
  clients,
  SharedActions,
}: ProjectListProps) {
  return (
    <List.Item
      key={project.id}
      title={project.name}
      subtitle={isShowingDetail ? undefined : client?.name}
      accessories={
        isShowingDetail
          ? undefined
          : [{ icon: { source: Icon.Dot, tintColor: project.color } }, { tag: project.status }]
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title={`${isShowingDetail ? "Close" : "Show"} Details`}
              icon={Icon.Info}
              onAction={() => setIsShowingDetail((current) => !current)}
            />
            {canModifyProjectIn(workspace) && (
              <>
                <Action.Push
                  title="Edit Project"
                  icon={Icon.Pencil}
                  shortcut={Shortcut.Edit}
                  target={<ProjectForm projectWorkspace={workspace} {...{ project, clients, revalidateProjects }} />}
                />
                <Action
                  title={`${project.status === "archived" ? "Restore" : "Archive"} Project`}
                  icon={project.status === "archived" ? Icon.Undo : Icon.Tray}
                  shortcut={Shortcut.Archive}
                  onAction={() =>
                    withToast({
                      verb: project.status === "archived" ? Verb.Restore : Verb.Archive,
                      noun: "Project",
                      action: async () => {
                        await updateProject(project.workspace_id, project.id, {
                          active: project.status === "archived",
                        });
                        revalidateProjects();
                      },
                    })
                  }
                />
                <ActionPanel.Submenu
                  title="Delete Project..."
                  icon={{ source: Icon.Trash, tintColor: Color.Red }}
                  shortcut={Shortcut.Remove}
                >
                  <Action
                    title="Delete Only Project"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() =>
                      withToast({
                        verb: Verb.Delete,
                        noun: "Project",
                        action: async () => {
                          if (
                            await confirmAlert({
                              title: "Delete Project",
                              primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                              message: "Are you sure you'd like to delete this project?",
                            })
                          ) {
                            await deleteProject(project.workspace_id, project.id, "unassign");
                            revalidateProjects();
                          }
                        },
                      })
                    }
                  />
                  <Action
                    title="Delete Project and Associated Time Entries"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() =>
                      withToast({
                        verb: Verb.Delete,
                        noun: "Project",
                        action: async () => {
                          if (
                            await confirmAlert({
                              title: "Delete Project",
                              primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                              message:
                                "Are you sure you'd like to delete this project and all associated time entries?",
                            })
                          ) {
                            await deleteProject(project.workspace_id, project.id, "delete");
                            revalidateProjects();
                          }
                        },
                      })
                    }
                  />
                </ActionPanel.Submenu>
              </>
            )}
          </ActionPanel.Section>
          {SharedActions}
        </ActionPanel>
      }
      detail={
        <List.Item.Detail
          isLoading={isLoading}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="ID" text={workspace.id.toString()} />
              {organization && <List.Item.Detail.Metadata.Label title="Organization" text={organization.name} />}
              {workspace && <List.Item.Detail.Metadata.Label title="Workspace" text={workspace.name} />}
              <List.Item.Detail.Metadata.Label
                title="Color"
                text={project.color}
                icon={{ source: Icon.Dot, tintColor: project.color }}
              />
              {client && <List.Item.Detail.Metadata.Label title="Client" text={client.name} />}
              <List.Item.Detail.Metadata.Label title="Start Date" text={dayjs(project.start_date).format("M/D/YY")} />
              {project.end_date && (
                <List.Item.Detail.Metadata.Label title="End Date" text={dayjs(project.end_date).format("M/D/YY")} />
              )}
              {project.actual_seconds && (
                <List.Item.Detail.Metadata.Label title="Total Hours" text={formatSeconds(project.actual_seconds)} />
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
}
