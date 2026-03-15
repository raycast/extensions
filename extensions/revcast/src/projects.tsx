import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
} from "@raycast/api";

import { OnboardingDetail } from "./components/OnboardingDetail";
import { ProjectForm } from "./components/ProjectForm";
import { useProjects } from "./hooks/useProjects";
import { formatSecretKey } from "./lib/formatters";

export default function ProjectsCommand() {
  const projects = useProjects();

  if (!projects.isLoading && !projects.projects.length) {
    return (
      <OnboardingDetail
        onDidSaveProject={projects.saveProject}
        onUseDemo={projects.enableDemoProject}
      />
    );
  }

  async function handleActivateProject(projectId: string, projectName: string) {
    await projects.activateProject(projectId);
    await showToast({
      style: Toast.Style.Success,
      title: `${projectName} is active`,
    });
  }

  async function handleDeleteProject(projectId: string, projectName: string) {
    const confirmed = await confirmAlert({
      title: `Remove ${projectName}?`,
      message: "The project will be deleted from local storage on this device.",
      primaryAction: {
        title: "Remove Project",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    await projects.deleteProject(projectId);
    await showToast({
      style: Toast.Style.Success,
      title: `${projectName} removed`,
    });
  }

  return (
    <List
      isLoading={projects.isLoading}
      navigationTitle="Projects"
      searchBarPlaceholder="Filter projects"
    >
      <List.Section
        title="Stripe Projects"
        subtitle={`${projects.projects.length} saved`}
      >
        {projects.projects.map((project) => {
          const accessories = [];

          if (project.id === projects.activeProject?.id) {
            accessories.push({ tag: { value: "Active", color: Color.Green } });
          }

          if (project.isDemo) {
            accessories.push({
              tag: { value: "Demo", color: Color.SecondaryText },
            });
          }

          accessories.push({ text: formatSecretKey(project.secretKey) });

          return (
            <List.Item
              key={project.id}
              icon={
                project.isDemo
                  ? { source: Icon.AppWindow, tintColor: Color.Orange }
                  : Icon.Lock
              }
              title={project.name}
              subtitle={project.dashboardUrl}
              accessories={accessories}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    {project.id !== projects.activeProject?.id ? (
                      <Action
                        title="Set Active Project"
                        icon={Icon.CheckCircle}
                        onAction={() =>
                          void handleActivateProject(project.id, project.name)
                        }
                      />
                    ) : null}
                    <Action.Push
                      title="Add Project"
                      icon={Icon.Plus}
                      target={<ProjectForm onDidSave={projects.saveProject} />}
                    />
                    <Action
                      title="Use Demo Metrics"
                      icon={Icon.AppWindow}
                      onAction={() => void projects.enableDemoProject()}
                    />
                    <Action.OpenInBrowser
                      title="Open Stripe Dashboard"
                      url={project.dashboardUrl}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Remove Project"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() =>
                        void handleDeleteProject(project.id, project.name)
                      }
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
