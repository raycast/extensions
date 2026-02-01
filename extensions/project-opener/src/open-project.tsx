import {
  ActionPanel,
  Action,
  List,
  Icon,
  getPreferenceValues,
  open,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { findProjects, Project } from "./utils";
import { loadAllSettings, ProjectSettings } from "./settings";
import ProjectSettingsForm, { iconFromString } from "./ProjectSettingsForm";

interface Preferences {
  ide: { path: string; name: string };
  projectsDirectory: string;
  searchDepth: string;
}

interface ProjectWithSettings extends Project {
  settings: ProjectSettings;
}

export default function Command() {
  const [projects, setProjects] = useState<ProjectWithSettings[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  const preferences = getPreferenceValues<Preferences>();
  const searchDepth = parseInt(preferences.searchDepth || "2", 10);

  const loadProjects = useCallback(() => {
    try {
      const found = findProjects(preferences.projectsDirectory, searchDepth);
      const allSettings = loadAllSettings();

      const projectsWithSettings: ProjectWithSettings[] = found.map(
        (project) => ({
          ...project,
          settings: allSettings[project.path] || {},
        }),
      );

      setProjects(projectsWithSettings);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to scan projects",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, [preferences.projectsDirectory, searchDepth]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search projects...">
      {projects.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No projects found"
          description={`No projects found in ${preferences.projectsDirectory}`}
        />
      ) : (
        projects.map((project) => (
          <List.Item
            key={project.path}
            title={project.settings.displayName || project.name}
            subtitle={
              project.relativePath !== project.name
                ? project.relativePath
                : undefined
            }
            icon={iconFromString(project.settings.icon) || Icon.Folder}
            keywords={[project.name, project.settings.displayName || ""].filter(
              Boolean,
            )}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title={`Open in ${project.settings.ide?.name || preferences.ide.name}`}
                    icon={Icon.ArrowRight}
                    onAction={async () => {
                      const idePath =
                        project.settings.ide?.path || preferences.ide.path;
                      await open(project.path, idePath);
                    }}
                  />
                  <Action.ShowInFinder path={project.path} />
                  <Action.CopyToClipboard
                    title="Copy Path"
                    content={project.path}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Project Settings"
                    icon={Icon.Gear}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                    onAction={() => {
                      push(
                        <ProjectSettingsForm
                          projectPath={project.path}
                          projectName={project.name}
                          onSave={loadProjects}
                        />,
                      );
                    }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
