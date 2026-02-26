import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
  Form,
  popToRoot,
} from "@raycast/api";
import { useState, useEffect, useMemo, useCallback } from "react";
import { existsSync } from "fs";
import { ensureClaudeInstalled } from "./lib/claude-cli";
import {
  getAllProjects,
  addFavorite,
  removeFavorite,
  addRecentProject,
  getGitInfo,
  Project,
} from "./lib/project-discovery";
import { launchClaudeCode, openTerminalWithCommand } from "./lib/terminal";

// Type for batched git info
type GitInfoMap = Record<
  string,
  { branch: string; hasChanges: boolean; remote?: string } | null
>;

export default function LaunchProject() {
  const [isLoading, setIsLoading] = useState(true);
  const [favorites, setFavorites] = useState<Project[]>([]);
  const [recent, setRecent] = useState<Project[]>([]);
  const [all, setAll] = useState<Project[]>([]);
  const [searchText, setSearchText] = useState("");
  const [gitInfoMap, setGitInfoMap] = useState<GitInfoMap>({});

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    const projects = await getAllProjects();
    setFavorites(projects.favorites);
    setRecent(projects.recent);
    setAll(projects.all);
    setIsLoading(false);

    // Batch load git info for all projects
    const allProjects = [
      ...projects.favorites,
      ...projects.recent,
      ...projects.all,
    ];
    const uniquePaths = [...new Set(allProjects.map((p) => p.path))];

    // Load git info in parallel with error handling
    const gitInfoEntries = await Promise.all(
      uniquePaths.map(async (projectPath) => {
        try {
          const info = await getGitInfo(projectPath);
          return [projectPath, info] as const;
        } catch {
          return [projectPath, null] as const;
        }
      }),
    );

    setGitInfoMap(Object.fromEntries(gitInfoEntries));
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Memoize filtered lists to avoid recalculating on every render
  const filteredFavorites = useMemo(
    () =>
      favorites.filter((p) =>
        p.name.toLowerCase().includes(searchText.toLowerCase()),
      ),
    [favorites, searchText],
  );
  const filteredRecent = useMemo(
    () =>
      recent.filter((p) =>
        p.name.toLowerCase().includes(searchText.toLowerCase()),
      ),
    [recent, searchText],
  );
  const filteredAll = useMemo(
    () =>
      all.filter((p) =>
        p.name.toLowerCase().includes(searchText.toLowerCase()),
      ),
    [all, searchText],
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search projects..."
      onSearchTextChange={setSearchText}
    >
      {filteredFavorites.length > 0 && (
        <List.Section
          title="Favorites"
          subtitle={`${filteredFavorites.length} projects`}
        >
          {filteredFavorites.map((project) => (
            <ProjectItem
              key={project.path}
              project={project}
              gitInfo={gitInfoMap[project.path]}
              onToggleFavorite={async () => {
                await removeFavorite(project.path);
                loadProjects();
              }}
            />
          ))}
        </List.Section>
      )}

      {filteredRecent.length > 0 && (
        <List.Section
          title="Recent"
          subtitle={`${filteredRecent.length} projects`}
        >
          {filteredRecent.map((project) => (
            <ProjectItem
              key={project.path}
              project={project}
              gitInfo={gitInfoMap[project.path]}
              onToggleFavorite={async () => {
                await addFavorite(project.path);
                loadProjects();
              }}
            />
          ))}
        </List.Section>
      )}

      {filteredAll.length > 0 && (
        <List.Section
          title="All Projects"
          subtitle={`${filteredAll.length} projects`}
        >
          {filteredAll.map((project) => (
            <ProjectItem
              key={project.path}
              project={project}
              gitInfo={gitInfoMap[project.path]}
              onToggleFavorite={async () => {
                await addFavorite(project.path);
                loadProjects();
              }}
            />
          ))}
        </List.Section>
      )}

      {!isLoading &&
        filteredFavorites.length === 0 &&
        filteredRecent.length === 0 &&
        filteredAll.length === 0 && (
          <List.EmptyView
            title="No Projects Found"
            description="Run Claude Code in a project directory to see it here, or open a project in VS Code."
            icon={Icon.Folder}
          />
        )}
    </List>
  );
}

function ProjectItem({
  project,
  gitInfo,
  onToggleFavorite,
}: {
  project: Project;
  gitInfo:
    | { branch: string; hasChanges: boolean; remote?: string }
    | null
    | undefined;
  onToggleFavorite: () => void;
}) {
  const accessories: List.Item.Accessory[] = [];

  if (project.sessionCount && project.sessionCount > 0) {
    accessories.push({
      text: `${project.sessionCount} session${project.sessionCount > 1 ? "s" : ""}`,
      icon: Icon.Message,
    });
  }

  if (gitInfo?.branch) {
    accessories.push({
      tag: {
        value: gitInfo.branch,
        color: gitInfo.hasChanges ? Color.Yellow : Color.Green,
      },
      icon: Icon.ArrowNe,
    });
  }

  if (project.lastAccessed) {
    accessories.push({
      date: project.lastAccessed,
      tooltip: `Last accessed: ${project.lastAccessed.toLocaleString()}`,
    });
  }

  async function handleLaunch() {
    if (!(await ensureClaudeInstalled())) return;
    if (!existsSync(project.path)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Project path no longer exists",
        message: project.path,
      });
      return;
    }
    await addRecentProject(project.path);
    await launchClaudeCode({ projectPath: project.path });
    await popToRoot();
  }

  async function handleContinue() {
    if (!(await ensureClaudeInstalled())) return;
    if (!existsSync(project.path)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Project path no longer exists",
        message: project.path,
      });
      return;
    }
    await addRecentProject(project.path);
    await launchClaudeCode({
      projectPath: project.path,
      continueSession: true,
    });
    await popToRoot();
  }

  return (
    <List.Item
      title={project.name}
      subtitle={project.path}
      icon={
        project.isFavorite
          ? { source: Icon.Star, tintColor: Color.Yellow }
          : Icon.Folder
      }
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Launch">
            <Action
              title="New Session"
              icon={Icon.Plus}
              onAction={handleLaunch}
            />
            <Action
              title="Continue Last Session"
              icon={Icon.ArrowRight}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={handleContinue}
            />
            <Action.Push
              title="Continue with Prompt"
              icon={Icon.Message}
              shortcut={{ modifiers: ["cmd"], key: "p" }}
              target={<ContinueWithPromptForm project={project} />}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Open">
            <Action
              title="Open in VS Code"
              icon={Icon.Code}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
              onAction={async () => {
                await openTerminalWithCommand(`code "${project.path}"`);
                await popToRoot();
              }}
            />
            {existsSync(project.path) && (
              <Action.ShowInFinder path={project.path} />
            )}
            <Action
              title="Open in Terminal"
              icon={Icon.Terminal}
              shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
              onAction={async () => {
                await openTerminalWithCommand(`cd "${project.path}" && $SHELL`);
                await popToRoot();
              }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Organize">
            <Action
              title={
                project.isFavorite
                  ? "Remove from Favorites"
                  : "Add to Favorites"
              }
              icon={project.isFavorite ? Icon.StarDisabled : Icon.Star}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
              onAction={onToggleFavorite}
            />
            <Action.CopyToClipboard
              title="Copy Path"
              content={project.path}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function ContinueWithPromptForm({ project }: { project: Project }) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: { prompt: string }) {
    if (!values.prompt.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please enter a prompt",
      });
      return;
    }

    if (!(await ensureClaudeInstalled())) return;
    if (!existsSync(project.path)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Project path no longer exists",
        message: project.path,
      });
      return;
    }

    setIsLoading(true);
    await addRecentProject(project.path);
    await launchClaudeCode({
      projectPath: project.path,
      continueSession: true,
      prompt: values.prompt,
    });
    await popToRoot();
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Continue with Prompt"
            icon={Icon.Message}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Project"
        text={`${project.name} (${project.path})`}
      />
      <Form.TextArea
        id="prompt"
        title="Prompt"
        placeholder="Enter your prompt to continue the session..."
        autoFocus
      />
    </Form>
  );
}
