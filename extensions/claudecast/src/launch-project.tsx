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
  getPreferenceValues,
  open,
} from "@raycast/api";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
import {
  launchClaudeCode,
  openTerminalAtPath,
  openWslTerminalAtPath,
} from "./lib/terminal";
import { shortcut } from "./lib/shortcuts";

// Type for batched git info
type GitInfoMap = Record<
  string,
  { branch: string; hasChanges: boolean; remote?: string } | null
>;

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (nextIndex < items.length) {
        const index = nextIndex++;
        results[index] = await mapper(items[index]);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

export default function LaunchProject() {
  const [isLoading, setIsLoading] = useState(true);
  const [favorites, setFavorites] = useState<Project[]>([]);
  const [recent, setRecent] = useState<Project[]>([]);
  const [all, setAll] = useState<Project[]>([]);
  const [searchText, setSearchText] = useState("");
  const [gitInfoMap, setGitInfoMap] = useState<GitInfoMap>({});
  const loadSequence = useRef(0);

  const loadProjects = useCallback(async () => {
    const sequence = ++loadSequence.current;
    setIsLoading(true);
    try {
      const projects = await getAllProjects();
      if (sequence !== loadSequence.current) return;
      setFavorites(projects.favorites);
      setRecent(projects.recent);
      setAll(projects.all);

      const allProjects = [
        ...projects.favorites,
        ...projects.recent,
        ...projects.all,
      ];
      const uniqueProjects = [
        ...new Map(
          allProjects.map((project) => [project.path, project]),
        ).values(),
      ];
      const gitInfoEntries = await mapWithConcurrency(
        uniqueProjects,
        4,
        async (project) => {
          if (project.wsl) return [project.path, null] as const;
          try {
            const info = await getGitInfo(project.path);
            return [project.path, info] as const;
          } catch {
            return [project.path, null] as const;
          }
        },
      );
      if (sequence === loadSequence.current) {
        setGitInfoMap(Object.fromEntries(gitInfoEntries));
      }
    } catch (error) {
      if (sequence === loadSequence.current) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Projects Could Not Be Loaded",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    } finally {
      if (sequence === loadSequence.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
    return () => {
      loadSequence.current++;
    };
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

async function ensureProjectCanLaunch(project: Project): Promise<boolean> {
  if (!existsSync(project.path)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Project Path No Longer Exists",
      message: project.path,
    });
    return false;
  }
  if (project.wsl) {
    if (project.wsl.claudeExecutable) return true;
    await showToast({
      style: Toast.Style.Failure,
      title: "Claude Code Is Missing in WSL",
      message: `Install Claude Code Inside ${project.wsl.distribution}`,
    });
    return false;
  }
  return ensureClaudeInstalled();
}

async function runProjectLaunch(
  failureTitle: string,
  action: () => Promise<boolean>,
): Promise<void> {
  try {
    if (await action()) await popToRoot();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: failureTitle,
      message: error instanceof Error ? error.message : String(error),
    });
  }
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

  if (project.wsl) {
    accessories.push({
      tag: { value: `WSL ${project.wsl.distribution}`, color: Color.Purple },
    });
  }

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
    await runProjectLaunch("New Session Could Not Be Launched", async () => {
      if (!(await ensureProjectCanLaunch(project))) return false;
      const prefs = getPreferenceValues<Preferences.LaunchProject>();
      await addRecentProject(project.path);
      await launchClaudeCode({
        projectPath: project.path,
        permissionMode: prefs.permissionMode || "default",
        model: prefs.model || undefined,
        wsl: project.wsl,
      });
      return true;
    });
  }

  async function handleContinue() {
    await runProjectLaunch("Session Could Not Be Continued", async () => {
      if (!(await ensureProjectCanLaunch(project))) return false;
      const prefs = getPreferenceValues<Preferences.LaunchProject>();
      await addRecentProject(project.path);
      await launchClaudeCode({
        projectPath: project.path,
        continueSession: true,
        permissionMode: prefs.permissionMode || "default",
        model: prefs.model || undefined,
        wsl: project.wsl,
      });
      return true;
    });
  }

  async function handleWorktreeLaunch() {
    await runProjectLaunch(
      "Worktree Session Could Not Be Launched",
      async () => {
        if (!(await ensureProjectCanLaunch(project))) return false;
        const prefs = getPreferenceValues<Preferences.LaunchProject>();
        await addRecentProject(project.path);
        await launchClaudeCode({
          projectPath: project.path,
          worktree: true,
          permissionMode: prefs.permissionMode || "default",
          model: prefs.model || undefined,
          wsl: project.wsl,
        });
        return true;
      },
    );
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
            {gitInfo && (
              <Action
                title="New Worktree Session"
                icon={Icon.Tree}
                onAction={handleWorktreeLaunch}
              />
            )}
            <Action
              title="Continue Last Session"
              icon={Icon.ArrowRight}
              shortcut={shortcut.refresh}
              onAction={handleContinue}
            />
            <Action.Push
              title="Continue with Prompt"
              icon={Icon.Message}
              shortcut={shortcut.primaryShift("p")}
              target={<ContinueWithPromptForm project={project} />}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Open">
            <Action
              title="Open in VS Code"
              icon={Icon.Code}
              shortcut={shortcut.open}
              onAction={async () => {
                await open(project.path, "Visual Studio Code");
                await popToRoot();
              }}
            />
            {existsSync(project.path) && (
              <Action.ShowInFinder path={project.path} />
            )}
            <Action
              title="Open in Terminal"
              icon={Icon.Terminal}
              shortcut={shortcut.primaryShift("t")}
              onAction={async () => {
                if (project.wsl) {
                  await openWslTerminalAtPath(project.wsl);
                } else {
                  await openTerminalAtPath(project.path);
                }
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
              shortcut={shortcut.primary("f")}
              onAction={onToggleFavorite}
            />
            <Action.CopyToClipboard
              title="Copy Path"
              content={project.path}
              shortcut={shortcut.copyPath}
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
        title: "Enter a Prompt",
      });
      return;
    }

    try {
      if (!(await ensureProjectCanLaunch(project))) return;
      const prefs = getPreferenceValues<Preferences.LaunchProject>();
      const model = prefs.model || undefined;
      setIsLoading(true);
      await addRecentProject(project.path);
      await launchClaudeCode({
        projectPath: project.path,
        continueSession: true,
        prompt: values.prompt,
        permissionMode: prefs.permissionMode || "default",
        model,
        wsl: project.wsl,
      });
      await popToRoot();
    } catch (error) {
      setIsLoading(false);
      await showToast({
        style: Toast.Style.Failure,
        title: "Session Could Not Be Continued",
        message: error instanceof Error ? error.message : String(error),
      });
    }
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
