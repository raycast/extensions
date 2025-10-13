import { homedir } from "os";
import { useState, useEffect } from "react";
import { showFailureToast } from "@raycast/utils";
import { List, ActionPanel, Action, Icon, useNavigation, showToast, Toast, Color } from "@raycast/api";

import { getExtensionConfig, updateProjectLastUsedAt } from "../utils/config";
import { generateProjectKeywords } from "../utils/pinyin";
import { getRepositoryBranch } from "../utils/command";
import ConfigureProjects from "../configure-projects";
import ReadmeView from "../readme-view";
import { ExtensionConfig, Project, ProjectExtraInfo } from "../types";

interface ProjectListProps {
  onProjectAction: (project: Project, config: ExtensionConfig, extraInfo: ProjectExtraInfo) => void;
  requiredFields?: string[];
  actionPanelExtra?: React.ReactNode;
  actionTitle: string;
}

type BranchMap = Record<string, string | null>;

export default function ProjectList({
  onProjectAction,
  requiredFields = ["name", "path"],
  actionPanelExtra,
  actionTitle,
}: ProjectListProps) {
  const { push } = useNavigation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [config, setConfig] = useState<ExtensionConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [branchMap, setBranchMap] = useState<BranchMap>({});

  function formatPath(projectPath: string) {
    const homeDir = homedir();
    if (projectPath.startsWith(homeDir)) {
      return projectPath.replace(homeDir, "~");
    }
    return projectPath;
  }

  useEffect(() => {
    loadProjects();
  }, [refreshTrigger]);

  useEffect(() => {
    if (!projects.length) return;

    async function fetchProjectsBranch() {
      const map: BranchMap = {};
      await Promise.allSettled(
        projects.map(async (project) => {
          const branch = await getRepositoryBranch(project.path, project.repositoryType);
          map[project.id] = branch;
        }),
      );
      setBranchMap(map);
    }
    fetchProjectsBranch();
  }, [projects]);

  async function loadProjects() {
    try {
      setIsLoading(true);
      const config = await getExtensionConfig();
      setConfig(config);
      setProjects(config.projects);
    } catch (error) {
      console.error("Failed to load projects:", error);
      await showFailureToast(error, { title: "Failed to Load", message: "Could not load project configuration" });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRefresh() {
    try {
      await loadProjects();
      await showToast({
        style: Toast.Style.Success,
        title: "Refreshed",
        message: "Project list has been updated",
      });
    } catch (error) {
      await showFailureToast(error, { title: "Failed to Refresh" });
    }
  }

  function handleConfigChange() {
    // Trigger a refresh by updating the refreshTrigger
    setRefreshTrigger((prev) => prev + 1);
  }

  if (!isLoading && projects.length === 0) {
    return (
      <List searchBarPlaceholder="Search project...">
        <List.EmptyView
          icon={{ source: "icon.svg" }}
          title="No Projects"
          description="No projects have been configured"
          actions={
            <ActionPanel>
              <Action.Push
                title="Go to Configuration"
                icon={Icon.Gear}
                target={<ConfigureProjects onConfigChange={handleConfigChange} />}
              />
              <Action
                title="Refresh Project List"
                icon={Icon.ArrowClockwise}
                onAction={handleRefresh}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              <Action title="About This Extension" icon={Icon.Book} onAction={() => push(<ReadmeView />)} />
              {actionPanelExtra}
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const missingFieldProject = projects.find((project) =>
    requiredFields.some((field) => {
      if (field === "name") return !project.name;
      if (field === "path") return !project.path;
      return false;
    }),
  );

  if (missingFieldProject) {
    return (
      <List searchBarPlaceholder="Search project...">
        <List.EmptyView
          icon={{ source: "icon.svg" }}
          title="Incomplete Configuration"
          description={`Missing required fields: ${requiredFields.join(", ")}`}
          actions={
            <ActionPanel>
              <Action.Push
                title="Go to Configuration"
                icon={Icon.Gear}
                target={<ConfigureProjects onConfigChange={handleConfigChange} />}
              />
              <Action
                title="Refresh Project List"
                icon={Icon.ArrowClockwise}
                onAction={handleRefresh}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              <Action title="About This Extension" icon={Icon.Book} onAction={() => push(<ReadmeView />)} />
              {actionPanelExtra}
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const sortedProjects = projects
    .slice()
    .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
    .map((project) => ({
      ...project,
      displayPath: formatPath(project.path),
      keywords: generateProjectKeywords(project),
    }));

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search project...">
      {sortedProjects.map((project) => {
        const accessories = branchMap[project.id]
          ? [{ tag: branchMap[project.id], icon: { source: "branch.svg", tintColor: Color.SecondaryText } }]
          : [];

        return (
          <List.Item
            key={project.id}
            icon={{ fileIcon: project.path }}
            title={project.name}
            keywords={project.keywords}
            subtitle={project.displayPath}
            accessories={accessories}
            actions={
              <ActionPanel>
                <Action
                  title={actionTitle}
                  icon={Icon.Terminal}
                  onAction={() => {
                    if (!config) return;
                    updateProjectLastUsedAt(project.id);
                    const extraInfo: ProjectExtraInfo = {
                      branch: branchMap[project.id],
                      displayPath: project.displayPath,
                    };
                    onProjectAction(project, config, extraInfo);
                  }}
                />
                <Action.Push
                  title="Go to Configuration"
                  icon={Icon.Gear}
                  target={<ConfigureProjects onConfigChange={handleConfigChange} />}
                />
                <Action.CopyToClipboard
                  title="Copy Project Path"
                  content={project.path}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                />
                <Action
                  title="Refresh Project List"
                  icon={Icon.ArrowClockwise}
                  onAction={handleRefresh}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
                <Action title="About This Extension" icon={Icon.Book} onAction={() => push(<ReadmeView />)} />
                {actionPanelExtra}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
