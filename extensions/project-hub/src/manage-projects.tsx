import { ActionPanel, Action, Icon, List, showToast, Toast, getPreferenceValues, Keyboard } from "@raycast/api";
import { useEffect, useState } from "react";
import { Project } from "./types";
import { getProjects, deleteProject } from "./utils/storage";
import { ProjectForm } from "./components/ProjectForm";
import { ProjectView } from "./components/ProjectView";
import { showFailureToast, getAvatarIcon } from "@raycast/utils";
import { CreateProjectAction } from "./components/actions/CreateProjectAction";

interface Preferences {
  maxRecentProjects?: string;
}

export default function Command() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const preferences = getPreferenceValues<Preferences>();
  const maxRecent = Math.min(Math.max(parseInt(preferences.maxRecentProjects || "3"), 1), 9);

  async function loadProjects() {
    try {
      const loadedProjects = await getProjects();
      setProjects(loadedProjects);
    } catch (error) {
      await showFailureToast(error, { title: "Failed to load projects" });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteProject(id);
      await showToast({
        style: Toast.Style.Success,
        title: "Project deleted",
      });
      await loadProjects();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to delete project" });
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  // Get recent projects (most used first)
  const recentProjects = projects
    .filter((p) => p.lastUsed)
    .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
    .slice(0, maxRecent);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search projects..."
      filtering={{
        keepSectionOrder: true,
      }}
      actions={
        <ActionPanel>
          <CreateProjectAction onSave={loadProjects} />
        </ActionPanel>
      }
    >
      {/* Recent Projects Section */}
      {recentProjects.length > 0 && (
        <List.Section title="Recent Projects" subtitle={`Last ${maxRecent} used`}>
          {recentProjects.map((project, index) => (
            <List.Item
              key={`recent-${project.id}`}
              icon={getAvatarIcon(project.title, { background: project.color || "#8E8E93", gradient: false })}
              title={project.title}
              subtitle={project.subtitle}
              keywords={[project.title, project.subtitle].filter((item): item is string => Boolean(item))}
              accessories={[{ text: `⌘${index + 1}` }]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.Push
                      title="Open Project"
                      icon={Icon.ArrowRight}
                      target={<ProjectView project={project} />}
                      shortcut={{ modifiers: ["cmd"], key: `${index + 1}` as Keyboard.KeyEquivalent }}
                    />
                    <Action.Push
                      title="Edit Project"
                      icon={Icon.Pencil}
                      target={<ProjectForm project={project} onSave={loadProjects} />}
                      shortcut={{ modifiers: ["cmd"], key: "e" }}
                    />
                    <CreateProjectAction onSave={loadProjects} />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Delete Project"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => handleDelete(project.id)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {/* All Projects Section */}
      {projects.length > 0 ? (
        <List.Section title="All Projects" subtitle={`${projects.length} total`}>
          {projects.map((project) => (
            <List.Item
              key={project.id}
              icon={getAvatarIcon(project.title, { background: project.color || "#8E8E93", gradient: false })}
              title={project.title}
              subtitle={project.subtitle}
              keywords={[project.title, project.subtitle].filter((item): item is string => Boolean(item))}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.Push
                      title="Open Project"
                      icon={Icon.ArrowRight}
                      target={<ProjectView project={project} />}
                    />
                    <Action.Push
                      title="Edit Project"
                      icon={Icon.Pencil}
                      target={<ProjectForm project={project} onSave={loadProjects} />}
                      shortcut={{ modifiers: ["cmd"], key: "e" }}
                    />
                    <CreateProjectAction onSave={loadProjects} />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Delete Project"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => handleDelete(project.id)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : (
        <List.EmptyView
          icon={Icon.Document}
          title="No Projects"
          description="Create your first project to get started"
          actions={
            <ActionPanel>
              <CreateProjectAction onSave={loadProjects} showShortcut={false} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
