import { Action, ActionPanel, Color, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { IssuePriorityValue, User } from "@linear/sdk";
import { getProgressIcon, MutatePromise } from "@raycast/utils";

import { ProjectResult } from "../api/getProjects";

import { getLinearClient } from "../helpers/withLinearClient";
import { isLinearInstalled } from "../helpers/isLinearInstalled";
import { getProjectIcon, projectStatusIcon, projectStatusText } from "../helpers/projects";
import { getUserIcon } from "../helpers/users";
import { getErrorMessage } from "../helpers/errors";

import ProjectIssues from "./ProjectIssues";
import EditProjectForm from "./EditProjectForm";

type ProjectProps = {
  project: ProjectResult;
  teamId?: string;
  priorities: IssuePriorityValue[] | undefined;
  users: User[] | undefined;
  me: User | undefined;
  mutateProjects: MutatePromise<ProjectResult[] | undefined>;
};

export default function Project({ project, teamId, priorities, users, me, mutateProjects }: ProjectProps) {
  const { linearClient } = getLinearClient();

  const progress = `${Math.round(project.progress * 100)}%`;

  const keywords = [project.state, projectStatusText[project.state]];

  if (project.lead) {
    keywords.push(project.lead.displayName, project.lead?.email);
  }

  keywords.push(project.milestone ? project.milestone.name : "Upcoming");

  async function deleteProject() {
    if (
      await confirmAlert({
        title: "Delete Issue",
        message: "Are you sure you want to delete the selected project?",
        icon: { source: Icon.Trash, tintColor: Color.Red },
      })
    ) {
      try {
        await showToast({ style: Toast.Style.Animated, title: "Deleting project" });

        await mutateProjects(linearClient.projectArchive(project.id), {
          optimisticUpdate(data) {
            if (!data) {
              return data;
            }

            return data?.filter((p) => p.id !== project.id);
          },
        });

        await showToast({
          style: Toast.Style.Success,
          title: "Project deleted",
          message: `"${project.name}" is deleted`,
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete project",
          message: getErrorMessage(error),
        });
      }
    }
  }

  return (
    <List.Item
      key={project.id}
      title={project.name}
      subtitle={project.description}
      keywords={keywords}
      icon={getProjectIcon(project)}
      accessories={[
        { text: progress, tooltip: `Progress: ${progress}` },
        {
          icon: getProgressIcon(project.progress, project.color, { background: "white" }),
          tooltip: `Progress: ${progress}`,
        },
        { icon: { source: projectStatusIcon[project.state] }, tooltip: projectStatusText[project.state] },
        {
          icon: getUserIcon(project.lead),
          tooltip: project.lead ? `Lead: ${project.lead?.displayName} (${project.lead?.email})` : "Unassigned",
        },
      ]}
      actions={
        <ActionPanel title={project.name}>
          <Action.Push
            target={
              <ProjectIssues projectId={project.id} teamId={teamId} priorities={priorities} users={users} me={me} />
            }
            title="Show Issues"
            icon={Icon.List}
          />

          {isLinearInstalled ? (
            <Action.Open title="Open Project in Linear" icon="linear.png" target={project.url} application="Linear" />
          ) : (
            <Action.OpenInBrowser title="Open Project in Browser" url={project.url} />
          )}

          <ActionPanel.Section>
            <Action.Push
              title="Edit Project"
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              target={<EditProjectForm project={project} mutateProjects={mutateProjects} />}
            />

            <Action
              title="Delete Project"
              onAction={deleteProject}
              style={Action.Style.Destructive}
              icon={Icon.Trash}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action.CopyToClipboard
              icon={Icon.Clipboard}
              content={project.url}
              title="Copy Project URL"
              shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
            />

            <Action.CopyToClipboard
              icon={Icon.Clipboard}
              content={project.name}
              title="Copy Project Title"
              shortcut={{ modifiers: ["cmd", "shift"], key: "'" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
