import { IssuePriorityValue, User } from "@linear/sdk";
import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { getProgressIcon, MutatePromise } from "@raycast/utils";
import { format } from "date-fns";

import { ProjectResult } from "../api/getProjects";
import { getLinearClient } from "../api/linearClient";
import { getDateIcon } from "../helpers/dates";
import { getErrorMessage } from "../helpers/errors";
import { getProjectIcon, projectStatusIcon } from "../helpers/projects";
import { getUserIcon } from "../helpers/users";

import CreateMilestoneForm from "./CreateMilestoneForm";
import EditProjectForm from "./EditProjectForm";
import OpenInLinear from "./OpenInLinear";
import ProjectIssues from "./ProjectIssues";
import ProjectUpdates from "./ProjectUpdates";
import { DocumentList } from "./docs/DocumentList";

type ProjectProps = {
  project: ProjectResult;
  priorities: IssuePriorityValue[] | undefined;
  me: User | undefined;
  mutateProjects: MutatePromise<ProjectResult[], ProjectResult[]>;
};

export default function Project({ project, priorities, me, mutateProjects }: ProjectProps) {
  const { linearClient } = getLinearClient();

  const progress = `${Math.round(project.progress * 100)}%`;

  const keywords = [project.status.name, ...project.teams.nodes.map((t) => t.key)];

  if (project.lead) {
    keywords.push(project.lead.displayName, project.lead?.email);
  }

  const deleteProject = () =>
    confirmAlert({
      title: "Delete Project",
      message: "Are you sure you want to delete the selected project?",
      icon: { source: Icon.Trash, tintColor: Color.Red },
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive, onAction: tryDeleteProject },
    });

  async function tryDeleteProject() {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting project" });
    mutateProjects(linearClient.archiveProject(project.id), {
      optimisticUpdate(data) {
        if (!data) {
          return data;
        }

        return data?.filter((p) => p.id !== project.id);
      },
    })
      .then(() => {
        toast.style = Toast.Style.Success;
        toast.title = "Project deleted";
        toast.message = `"${project.name}" is deleted`;
      })
      .catch((err) => {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to delete project";
        toast.message = getErrorMessage(err);
        toast.primaryAction = {
          title: "Retry",
          onAction: tryDeleteProject,
          shortcut: Keyboard.Shortcut.Common.Refresh,
        };
      });
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
        { icon: { source: projectStatusIcon[project.status.type] }, tooltip: project.status.name },
        {
          icon: getUserIcon(project.lead),
          tooltip: project.lead ? `Lead: ${project.lead?.displayName} (${project.lead?.email})` : "Unassigned",
        },
      ]}
      actions={
        <ActionPanel title={project.name}>
          <Action.Push
            target={<ProjectIssues projectId={project.id} priorities={priorities} me={me} />}
            title="Show Issues"
            icon={Icon.List}
          />

          <OpenInLinear title="Open Project" url={project.url} />

          <Action.Push
            target={<CreateMilestoneForm projectId={project.id} />}
            title="Create Milestone"
            shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
            icon={{ source: "linear-icons/milestone.svg", tintColor: Color.PrimaryText }}
          />

          <ActionPanel.Section>
            <Action.Push
              title="Edit Project"
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              target={<EditProjectForm project={project} mutateProjects={mutateProjects} />}
            />

            <Action.Push
              title="See Project Updates"
              icon={Icon.Heartbeat}
              shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
              target={<ProjectUpdates project={project} />}
            />

            <Action.Push
              title="See Project Documents"
              icon={Icon.Document}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
              target={<DocumentList project={project} />}
            />

            <Action
              title="Delete Project"
              onAction={deleteProject}
              style={Action.Style.Destructive}
              icon={Icon.Trash}
              shortcut={Keyboard.Shortcut.Common.Remove}
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
