import {
  ActionPanel,
  Icon,
  showToast,
  Toast,
  List,
  confirmAlert,
  Action,
  Color,
  getPreferenceValues,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

import {
  Project as TProject,
  updateProject,
  deleteProject as apiDeleteProject,
  archiveProject as apiArchiveProject,
  SyncData,
} from "../api";
import ProjectForm from "../components/ProjectForm";
import RefreshAction from "../components/RefreshAction";
import { getProjectAppUrl, getProjectIcon, getProjectUrl } from "../helpers/projects";

import OpenInTodoist from "./OpenInTodoist";
import Project from "./Project";

type ProjectListItemProps = {
  project: TProject;
  data?: SyncData;
  setData: React.Dispatch<React.SetStateAction<SyncData | undefined>>;
};

export default function ProjectListItem({ project, data, setData }: ProjectListItemProps) {
  async function toggleFavorite(project: TProject) {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: project.is_favorite ? "Removing from favorites" : "Adding to favorites",
      });

      await updateProject({ id: project.id, is_favorite: !project.is_favorite }, { data, setData });

      await showToast({
        style: Toast.Style.Success,
        title: project.is_favorite ? "Removed from favorites" : "Added to favorites",
      });
    } catch (error) {
      await showFailureToast(error, { title: "Unable to update project" });
    }
  }

  async function archiveProject(id: string) {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Archiving project" });

      await apiArchiveProject(id, { data, setData });

      await showToast({ style: Toast.Style.Success, title: "Project archived" });
    } catch (error) {
      await showFailureToast(error, { title: "Unable to archive project" });
    }
  }

  async function deleteProject(id: string) {
    if (
      await confirmAlert({
        title: "Delete Project",
        message: "Are you sure you want to delete this project?",
        icon: { source: Icon.Trash, tintColor: Color.Red },
      })
    ) {
      try {
        await showToast({ style: Toast.Style.Animated, title: "Deleting project" });

        await apiDeleteProject(id, { data, setData });

        await showToast({ style: Toast.Style.Success, title: "Project deleted" });
      } catch (error) {
        await showFailureToast(error, { title: "Unable to delete project" });
      }
    }
  }

  const preferences = getPreferenceValues<Preferences.ShowProjects>();
  const taskCount = ((count: number) => {
    switch (count) {
      case 0:
        return "no task";
      case 1:
        return "1 task";
      default:
        return `${count} tasks`;
    }
  })(data?.items.filter((t) => t.project_id === project.id).length ?? 0);

  return (
    <List.Item
      key={project.id}
      icon={getProjectIcon(project)}
      title={project.name}
      subtitle={preferences.showTaskCount ? taskCount : undefined}
      accessories={[
        {
          icon: project.is_favorite ? { source: Icon.Star, tintColor: Color.Yellow } : undefined,
          tooltip: project.is_favorite ? "Favorite" : undefined,
        },
      ]}
      actions={
        <ActionPanel title={project.name}>
          <Action.Push icon={Icon.Sidebar} title="Show Tasks" target={<Project projectId={project.id} />} />
          <OpenInTodoist appUrl={getProjectAppUrl(project.id)} webUrl={getProjectUrl(project.id)} />
          {!project.inbox_project ? (
            <ActionPanel.Section>
              <Action.Push
                title="Edit Project"
                icon={Icon.Pencil}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                target={<ProjectForm project={project} />}
              />

              <Action
                title={project.is_favorite ? "Remove from Favorites" : "Add to Favorites"}
                icon={Icon.Star}
                shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                onAction={() => toggleFavorite(project)}
              />

              <Action
                title="Archive Project"
                icon={Icon.Folder}
                shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                onAction={() => archiveProject(project.id)}
              />

              <Action
                title="Delete Project"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={() => deleteProject(project.id)}
              />
            </ActionPanel.Section>
          ) : null}
          <ActionPanel.Section>
            <Action.Push
              title="Add New Project"
              target={<ProjectForm fromProjectList={true} />}
              shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
              icon={Icon.PlusCircle}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Project URL"
              content={getProjectUrl(project.id)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
            />

            <Action.CopyToClipboard
              title="Copy Project Title"
              content={project.name}
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
          </ActionPanel.Section>

          <RefreshAction />
        </ActionPanel>
      }
    />
  );
}
