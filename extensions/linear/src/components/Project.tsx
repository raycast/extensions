import { Action, ActionPanel, Color, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { IssuePriorityValue, User } from "@linear/sdk";
import { getProgressIcon, MutatePromise } from "@raycast/utils";
import { format } from "date-fns";

import { ProjectResult } from "../api/getProjects";

import { getLinearClient } from "../api/linearClient";
import { getProjectIcon, projectStatusIcon, projectStatusText } from "../helpers/projects";
import { getUserIcon } from "../helpers/users";
import { getErrorMessage } from "../helpers/errors";

import ProjectIssues from "./ProjectIssues";
import EditProjectForm from "./EditProjectForm";
import { getDateIcon } from "../helpers/dates";
import CreateMilestoneForm from "./CreateMilestoneForm";
import OpenInLinear from "./OpenInLinear";

type ProjectProps = {
  project: ProjectResult;
  priorities: IssuePriorityValue[] | undefined;
  users: User[] | undefined;
  me: User | undefined;
  mutateProjects: MutatePromise<ProjectResult[] | undefined>;
};

export default function Project({ project, priorities, users, me, mutateProjects }: ProjectProps) {
  const { linearClient } = getLinearClient();

  const progress = `${Math.round(project.progress * 100)}%`;

  const keywords = [project.state, projectStatusText[project.state], ...project.teams.nodes.map((t) => t.key)];

  if (project.lead) {
    keywords.push(project.lead.displayName, project.lead?.email);
  }

  async function deleteProject() {
    if (
      await confirmAlert({
        title: "Delete Project",
        message: "Are you sure you want to delete the selected project?",
        icon: { source: Icon.Trash, tintColor: Color.Red },
      })
    ) {
      try {
        await showToast({ style: Toast.Style.Animated, title: "Deleting project" });

        await mutateProjects(linearClient.archiveProject(project.id), {
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

  const teams = project.teams.nodes;
  const targetDate = project.targetDate ? new Date(project.targetDate) : null;

  return (
    <List.Item
      key={project.id}
      title={project.name}
      subtitle={project.description}
      keywords={keywords}
      icon={getProjectIcon(project)}
      accessories={[
        {
          icon: getProgressIcon(project.progress, project.color, { background: "white" }),
          tooltip: `Progress: ${progress}`,
        },
        {
          icon: targetDate ? getDateIcon(targetDate) : undefined,
          text: targetDate ? format(targetDate, "MMM dd") : undefined,
          tooltip: targetDate ? `Target date: ${format(targetDate, "MM/dd/yyyy")}` : undefined,
        },
        {
          icon: Icon.PersonLines,
          text: teams.length > 1 ? `${teams.length}` : teams[0].key,
          tooltip: `Teams: ${teams.map((team) => team.key).join(", ")}`,
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
            target={<ProjectIssues projectId={project.id} priorities={priorities} users={users} me={me} />}
            title="Show Issues"
            icon={Icon.List}
          />

          <Action.Push
            target={<CreateMilestoneForm projectId={project.id} />}
            title="Create Milestone"
            shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
            icon={{ source: "linear-icons/milestone.svg", tintColor: Color.PrimaryText }}
          />

          <OpenInLinear title="Open Project" url={project.url} />

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
