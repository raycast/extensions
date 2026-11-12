import { Action, ActionPanel, Alert, Icon, Keyboard, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { deleteProject, myProjects } from "./api";
import { ProjectForm } from "./components/ProjectForm";
import { ProjectCopyActions, ProjectListItem, ProjectOpenActions } from "./components/ProjectListItem";
import { Project } from "./types";

export default function Command() {
  const {
    data: projects,
    isLoading,
    error,
    revalidate,
    mutate,
  } = useCachedPromise(myProjects, [], { onError: (error) => console.error(error) });
  const [filter, setFilter] = useState("all");
  const shown = filter === "unverified" ? projects?.filter((project) => !project.verified) : projects;

  async function remove(project: Project) {
    const confirmed = await confirmAlert({
      title: `Remove ${project.name}?`,
      message: "It disappears from your profile and the directory. This can't be undone.",
      icon: Icon.Trash,
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    try {
      await mutate(deleteProject(project.id), {
        optimisticUpdate: (current) => current?.filter((other) => other.id !== project.id),
      });
      await showToast({ style: Toast.Style.Success, title: "Project removed" });
    } catch (error) {
      await showFailureToast(error, { title: "Couldn't remove project" });
    }
  }

  const addProject = (
    <Action.Push
      title="Add Project"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<ProjectForm navigationTitle="Add Project" onSave={revalidate} />}
    />
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter your projects…"
      searchBarAccessory={
        <List.Dropdown tooltip="Show" onChange={setFilter}>
          <List.Dropdown.Item title="All Projects" value="all" />
          <List.Dropdown.Item title="Unverified" value="unverified" />
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Couldn't load your projects"
          description={error.message}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ) : filter === "unverified" && projects?.length ? (
        <List.EmptyView icon={Icon.CheckCircle} title="All your projects are verified" />
      ) : (
        <List.EmptyView
          icon={Icon.AppWindow}
          title="No projects yet"
          description="Add the first project to your Build in Public profile."
          actions={<ActionPanel>{addProject}</ActionPanel>}
        />
      )}
      {shown?.map((project) => (
        <ProjectListItem
          key={project.id}
          project={project}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <ProjectOpenActions project={project} />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.Push
                  title="Edit Project"
                  icon={Icon.Pencil}
                  shortcut={Keyboard.Shortcut.Common.Edit}
                  target={
                    <ProjectForm project={project} navigationTitle={`Edit ${project.name}`} onSave={revalidate} />
                  }
                />
                {addProject}
                <ProjectCopyActions project={project} />
                <Action
                  title="Reload"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={revalidate}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Remove Project"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => remove(project)}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
