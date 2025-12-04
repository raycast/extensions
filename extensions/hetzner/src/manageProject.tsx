import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  List,
  LocalStorage,
  showToast,
  Toast,
} from "@raycast/api";
import React, { useEffect, useState } from "react";
import { Project } from "./models/project";
import { getAllProjects } from "./actions/project-action";
import {
  navigateToAddProject,
  navigateToManageServer,
} from "./actions/navigate-action";

export default function Command() {
  const [reloadState, setReloadView] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);

  async function changeProject(project: Project) {
    await showToast({
      style: Toast.Style.Animated,
      title: `Server action will be executed.`,
    });

    const projects = await LocalStorage.allItems();

    for (const projectKey in projects) {
      const storedProject = JSON.parse(projects[projectKey]) as Project;
      storedProject.selected = project.projectId === storedProject.projectId;

      await LocalStorage.setItem(projectKey, JSON.stringify(storedProject));
    }

    await showToast({
      style: Toast.Style.Success,
      title: `Project ${project.name} was set as default.`,
    });

    await navigateToManageServer();
  }

  async function deleteProject(project: Project) {
    if (
      await confirmAlert({
        title: "Are you sure?",
        primaryAction: {
          title: "Delete Project",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      await showToast({
        style: Toast.Style.Animated,
        title: `Server action will be executed.`,
      });

      await LocalStorage.removeItem(`project-${project.projectId}`);

      await showToast({
        style: Toast.Style.Success,
        title: `Project ${project.name} was deleted.`,
      });

      setReloadView(!reloadState);
    }
  }

  useEffect(() => {
    (async () => {
      setIsLoading(true);

      const projects = await getAllProjects();

      setProjects(projects);
      setIsLoading(false);
    })();
  }, [reloadState]);

  return (
    <List searchBarPlaceholder="Search project" isLoading={isLoading}>
      <List.EmptyView
        icon={Icon.Bug}
        title="Please create a project"
        actions={
          <ActionPanel>
            <Action
              title="Add New Project"
              icon={Icon.House}
              onAction={() => navigateToAddProject()}
            />
          </ActionPanel>
        }
      />
      <List.Section
        title="Total projects"
        subtitle={projects.length.toString()}
      >
        {projects.map((project) => {
          return (
            <List.Item
              key={project.projectId}
              icon={{
                source: project.selected ? Icon.Star : Icon.StarDisabled,
                tintColor: project.selected ? Color.Yellow : undefined,
              }}
              title={project.name}
              subtitle={`Project Id: ${project.projectId}`}
              accessories={[
                {
                  icon:
                    project.permission === "read" ? Icon.Glasses : Icon.Pencil,
                  text: {
                    value: `${project.permission}`,
                  },
                },
              ]}
              actions={
                <ActionPanel title={project.name}>
                  <Action
                    title="Set as Default Project"
                    icon={{ source: Icon.Star, tintColor: Color.Yellow }}
                    onAction={() => changeProject(project)}
                  />
                  <Action
                    title="Delete Project"
                    style={Action.Style.Destructive}
                    icon={Icon.Globe}
                    onAction={() => deleteProject(project)}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
