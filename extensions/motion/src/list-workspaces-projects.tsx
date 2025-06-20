import { List, ActionPanel, Action, showToast, Toast, Clipboard, LocalStorage } from "@raycast/api";
import { useState, useEffect } from "react";
import { getWorkspaces, getProjects, MotionWorkspace, MotionProject } from "./motion-api";

interface WorkspaceWithProjects extends MotionWorkspace {
  projects: MotionProject[];
}

export default function ListWorkspacesProjects() {
  const [workspaces, setWorkspaces] = useState<WorkspaceWithProjects[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        console.log("🔄 Loading workspaces and projects...");

        // Get workspaces first
        const workspaceList = await getWorkspaces();

        // Get projects for each workspace
        const workspacesWithProjects: WorkspaceWithProjects[] = [];

        for (const workspace of workspaceList) {
          try {
            const projects = await getProjects(workspace.id);
            workspacesWithProjects.push({
              ...workspace,
              projects,
            });
          } catch (error) {
            console.error(`Failed to load projects for workspace ${workspace.name}:`, error);
            workspacesWithProjects.push({
              ...workspace,
              projects: [],
            });
          }
        }

        setWorkspaces(workspacesWithProjects);
        console.log("✅ Loaded all workspaces and projects");
      } catch (error) {
        console.error("❌ Failed to load data:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Load Data",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  async function copyWorkspaceId(workspace: MotionWorkspace) {
    await Clipboard.copy(workspace.id);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied Workspace ID",
      message: `"${workspace.name}" ID copied to clipboard`,
    });
  }

  async function copyProjectId(project: MotionProject) {
    await Clipboard.copy(project.id);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied Project ID",
      message: `"${project.name}" ID copied to clipboard`,
    });
  }

  async function setDefaultWorkspace(workspace: MotionWorkspace) {
    try {
      await LocalStorage.setItem("defaultWorkspaceId", workspace.id);
      await showToast({
        style: Toast.Style.Success,
        title: "Default Workspace Set",
        message: `"${workspace.name}" is now your default workspace`,
      });
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Set Default",
        message: "Could not save workspace preference",
      });
    }
  }

  async function setDefaultProject(project: MotionProject, workspace: MotionWorkspace) {
    try {
      await LocalStorage.setItem("defaultProjectId", project.id);
      await LocalStorage.setItem("defaultWorkspaceId", workspace.id); // Also set workspace
      await showToast({
        style: Toast.Style.Success,
        title: "Default Project Set",
        message: `"${project.name}" is now your default project`,
      });
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Set Default",
        message: "Could not save project preference",
      });
    }
  }

  async function clearDefaultProject() {
    try {
      await LocalStorage.removeItem("defaultProjectId");
      await showToast({
        style: Toast.Style.Success,
        title: "Default Project Cleared",
        message: "No default project will be used",
      });
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Clear Default",
        message: "Could not clear project preference",
      });
    }
  }

  async function openRaycastPreferences() {
    // This will open Raycast preferences to the Motion extension
    await showToast({
      style: Toast.Style.Success,
      title: "Open Raycast Preferences",
      message: "Go to Raycast Preferences → Extensions → Motion to set all preferences",
    });
  }

  async function setDefaultPriority(priority: "ASAP" | "HIGH" | "MEDIUM" | "LOW") {
    try {
      await LocalStorage.setItem("defaultPriority", priority);
      const priorityEmoji = {
        ASAP: "🔴",
        HIGH: "🟠",
        MEDIUM: "🟡",
        LOW: "🔵",
      };
      await showToast({
        style: Toast.Style.Success,
        title: "Default Priority Set",
        message: `${priorityEmoji[priority]} ${priority} is now your default priority`,
      });
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Set Priority",
        message: "Could not save priority preference",
      });
    }
  }

  async function setDefaultDuration(duration: string) {
    try {
      await LocalStorage.setItem("defaultDuration", duration);
      await showToast({
        style: Toast.Style.Success,
        title: "Default Duration Set",
        message: `${duration} minutes is now your default duration`,
      });
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Set Duration",
        message: "Could not save duration preference",
      });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search workspaces and projects...">
      <List.Section title="Quick Setup">
        <List.Item
          title="⚙️ Open Raycast Preferences"
          subtitle="Set all preferences including priority and duration defaults"
          icon="⚙️"
          actions={
            <ActionPanel>
              <Action title="Open Preferences Guide" onAction={openRaycastPreferences} icon="⚙️" />
              <Action
                title="Clear Default Project"
                onAction={clearDefaultProject}
                icon="🗑️"
                shortcut={{ modifiers: ["cmd"], key: "backspace" }}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Set Default Priority">
        <List.Item
          title="🔴 ASAP Priority"
          subtitle="Set ASAP as your default priority for new tasks"
          icon="🔴"
          actions={
            <ActionPanel>
              <Action title="Set as Default Priority" onAction={() => setDefaultPriority("ASAP")} icon="⭐" />
            </ActionPanel>
          }
        />
        <List.Item
          title="🟠 High Priority"
          subtitle="Set High as your default priority for new tasks"
          icon="🟠"
          actions={
            <ActionPanel>
              <Action title="Set as Default Priority" onAction={() => setDefaultPriority("HIGH")} icon="⭐" />
            </ActionPanel>
          }
        />
        <List.Item
          title="🟡 Medium Priority"
          subtitle="Set Medium as your default priority for new tasks"
          icon="🟡"
          actions={
            <ActionPanel>
              <Action title="Set as Default Priority" onAction={() => setDefaultPriority("MEDIUM")} icon="⭐" />
            </ActionPanel>
          }
        />
        <List.Item
          title="🔵 Low Priority"
          subtitle="Set Low as your default priority for new tasks"
          icon="🔵"
          actions={
            <ActionPanel>
              <Action title="Set as Default Priority" onAction={() => setDefaultPriority("LOW")} icon="⭐" />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Set Default Duration">
        <List.Item
          title="⏱️ 15 minutes"
          subtitle="Set 15 minutes as your default task duration"
          icon="⏱️"
          actions={
            <ActionPanel>
              <Action title="Set as Default Duration" onAction={() => setDefaultDuration("15")} icon="⭐" />
            </ActionPanel>
          }
        />
        <List.Item
          title="⏱️ 30 minutes"
          subtitle="Set 30 minutes as your default task duration"
          icon="⏱️"
          actions={
            <ActionPanel>
              <Action title="Set as Default Duration" onAction={() => setDefaultDuration("30")} icon="⭐" />
            </ActionPanel>
          }
        />
        <List.Item
          title="⏱️ 60 minutes"
          subtitle="Set 60 minutes as your default task duration"
          icon="⏱️"
          actions={
            <ActionPanel>
              <Action title="Set as Default Duration" onAction={() => setDefaultDuration("60")} icon="⭐" />
            </ActionPanel>
          }
        />
        <List.Item
          title="⏱️ 120 minutes"
          subtitle="Set 120 minutes as your default task duration"
          icon="⏱️"
          actions={
            <ActionPanel>
              <Action title="Set as Default Duration" onAction={() => setDefaultDuration("120")} icon="⭐" />
            </ActionPanel>
          }
        />
      </List.Section>

      {workspaces.map((workspace) => (
        <List.Section key={workspace.id} title={`${workspace.name} (${workspace.type})`}>
          <List.Item
            title={workspace.name}
            subtitle={`Workspace ID: ${workspace.id}`}
            icon={workspace.type === "TEAM" ? "👥" : "👤"}
            accessories={[{ text: `${workspace.projects.length} projects` }, { text: workspace.type }]}
            actions={
              <ActionPanel>
                <Action title="Set as Default Workspace" onAction={() => setDefaultWorkspace(workspace)} icon="⭐" />
                <ActionPanel.Section title="Copy">
                  <Action
                    title="Copy Workspace ID"
                    onAction={() => copyWorkspaceId(workspace)}
                    icon="📋"
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
          {workspace.projects.map((project) => (
            <List.Item
              key={project.id}
              title={`  📁 ${project.name}`}
              subtitle={`Project ID: ${project.id}`}
              accessories={[{ text: project.description ? "Has description" : "No description" }]}
              actions={
                <ActionPanel>
                  <Action
                    title="Set as Default Project"
                    onAction={() => setDefaultProject(project, workspace)}
                    icon="⭐"
                  />
                  <ActionPanel.Section title="Copy">
                    <Action
                      title="Copy Project ID"
                      onAction={() => copyProjectId(project)}
                      icon="📋"
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action
                      title="Copy Workspace ID"
                      onAction={() => copyWorkspaceId(workspace)}
                      icon="👥"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
