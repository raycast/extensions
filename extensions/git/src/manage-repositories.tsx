import {
  ActionPanel,
  Action,
  Icon,
  List,
  confirmAlert,
  Alert,
  showToast,
  Toast,
  Form,
  useNavigation,
  Color,
  Image,
  LaunchType,
  launchCommand,
} from "@raycast/api";
import { useMemo, useState } from "react";
import { useRepositoriesList } from "./hooks/useRepositoriesList";
import { RepositoryDirectoryActions, RepositoryQuickLinkAction } from "./components/actions/RepositoryDirectoryActions";
import OpenRepository from "./open-repository";
import { Repository, RepositoryCloningState, RepositoryCloningProcess, Remote } from "./types";
import { useRepositoriesView } from "./hooks/useRepositoriesView";
import { useGitRemotes } from "./hooks/useGitRemotes";
import { RemoteHostIcon } from "./components/icons/RemoteHostIcons";
import { useGitRepository } from "./hooks/useGitRepository";
import { GitManager } from "./utils/git-manager";
import { useInterval } from "./hooks/useInterval";
import { promises as fs } from "fs";
import { basename, join } from "path";
import { prettyPath } from "./utils/path-utils";
import { existsSync } from "fs";
import { RemoteWebPageAction } from "./components/actions/RemoteActions";
import { showFailureToast, useCachedState } from "@raycast/utils";
import { CopyToClipboardMenuAction } from "./components/actions/CopyToClipboardMenuAction";

export default function ManageRepositories() {
  const {
    repositories: allRepositories,
    addRepository,
    visitRepository,
    removeRepository,
    updateCloningState,
  } = useRepositoriesList();
  // Separate cloning repositories from regular ones
  const cloningRepositories = useMemo(() => allRepositories.filter((repo) => repo.cloning), [allRepositories]);
  const currentRepositories = useMemo(() => allRepositories.filter((repo) => !repo.cloning), [allRepositories]);

  // Use view hook only for regular repositories
  const { displayedRepositories } = useRepositoriesView(currentRepositories);

  const handleRemove = async (repoPath: string) => {
    await removeRepository(repoPath);
  };

  const handleKillClone = async (repoPath: string) => {
    await removeRepository(repoPath);
  };

  return (
    <List
      searchBarPlaceholder="Search by name, path"
      actions={
        <ActionPanel>
          <AddRepositoryActions onAddRepository={addRepository} />
          <RepositoriesOrderActionsSection />
        </ActionPanel>
      }
    >
      {/* Cloning Repositories Section */}
      {cloningRepositories.length > 0 && (
        <List.Section title="Cloning in background">
          {cloningRepositories.map((repo) => (
            <CloningRepositoryListItem
              key={repo.id}
              repo={repo}
              onFinish={() => updateCloningState(repo.path, undefined)}
              onKill={() => handleKillClone(repo.path)}
              onRetry={(cloningProcess) => updateCloningState(repo.path, cloningProcess)}
              onOpen={() => visitRepository(repo.path)}
              onRemove={() => removeRepository(repo.path)}
            />
          ))}
        </List.Section>
      )}

      {currentRepositories.length === 0 && cloningRepositories.length === 0 ? (
        <List.EmptyView
          title="No recent repositories"
          description="Add new repositories using the 'Add Repository' action"
          icon={{ source: `git-project.svg`, tintColor: Color.SecondaryText }}
        />
      ) : (
        displayedRepositories.map((group) => (
          <List.Section key={group.groupTitle} title={group.groupTitle}>
            {group.repositories.map((repo) => (
              <RepositoryListItem
                key={repo.id}
                repo={repo}
                onOpen={() => visitRepository(repo.path)}
                onRemove={() => handleRemove(repo.path)}
                onAddRepository={addRepository}
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}

function RepositoryListItem({
  repo,
  onOpen,
  onRemove,
  onAddRepository,
}: {
  repo: Repository;
  onOpen: () => void;
  onRemove: () => void;
  onAddRepository: (repoPath: string) => void;
}) {
  const { gitManager } = useGitRepository(repo.path);
  if (!gitManager) return null;
  const { data: remotes } = useGitRemotes(gitManager);

  const accessories: List.Item.Accessory[] = useMemo(() => {
    const result = [];

    for (const remote of Object.values(remotes)) {
      if (remote.provider === undefined) continue;

      result.push({
        tag: { value: `${remote.displayName}` },
        icon: RemoteHostIcon(remote),
        tooltip: `Hosted on ${remote.provider} at ${remote.displayName}`,
      });
    }

    return result;
  }, [remotes]);

  const icon: Image.ImageLike = useMemo(() => {
    if (repo.languageStats && repo.languageStats.length > 0 && repo.languageStats[0].color) {
      return repo.languageStats[0].color;
    }

    return { source: `git-project.svg`, tintColor: Color.SecondaryText };
  }, [repo.languageStats]);

  const handleRemove = async () => {
    const confirmed = await confirmAlert({
      title: "Remove from recent?",
      message: `Are you sure you want to remove "${repo.name}" from the recent repositories list?`,
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      onRemove();
      await showToast({
        style: Toast.Style.Success,
        title: "Repository removed",
        message: `"${repo.name}" removed from recent list`,
      });
    }
  };

  return (
    <List.Item
      id={repo.id}
      key={repo.id}
      icon={icon}
      title={repo.name}
      subtitle={{
        value: prettyPath(repo.path),
        tooltip: repo.path,
      }}
      keywords={[repo.path, prettyPath(repo.path), ...(repo.languageStats?.map((lang) => lang.name) || [])].filter(
        (keyword): keyword is string => Boolean(keyword),
      )}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Show Repository"
              target={<OpenRepository arguments={{ path: repo.path }} />}
              icon={Icon.Book}
              onPush={onOpen}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <CopyToClipboardMenuAction
              contents={[
                { title: "Directory Path", content: repo.path, icon: Icon.Folder },
                ...Object.values(remotes).map((remote) => ({
                  title: remote.displayName,
                  content: remote.fetchUrl,
                  icon: Icon.Link,
                })),
              ]}
            />
            <RepositoryAttachedLinksAction remotes={remotes} />
            <RepositoryQuickLinkAction repositoryPath={repo.path} />
            <Action
              title="Remove from List"
              onAction={handleRemove}
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
            />
            <Action.Trash paths={[repo.path]} onTrash={onRemove} />
          </ActionPanel.Section>

          <RepositoryDirectoryActions repositoryPath={repo.path} onOpen={onOpen} />

          <RepositoriesOrderActionsSection />

          <ActionPanel.Section title="List">
            <AddRepositoryActions onAddRepository={onAddRepository} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function AddRepositoryActions({ onAddRepository }: { onAddRepository: (repoPath: string) => void }) {
  return (
    <ActionPanel.Submenu title="Add Repository" icon={Icon.Plus} shortcut={{ modifiers: ["cmd"], key: "n" }}>
      <Action.Push
        title="Create New Repository"
        target={<CreateRepositoryForm onAddRepository={onAddRepository} />}
        icon={Icon.NewFolder}
      />
      <Action.Push
        title="Add Existing Directory"
        target={<AddRepositoryForm onAddRepository={onAddRepository} />}
        icon={Icon.Folder}
      />
      <Action
        title="Clone Repository"
        onAction={async () =>
          await launchCommand({
            name: "clone-repository",
            type: LaunchType.UserInitiated,
            arguments: { url: "" },
          })
        }
        icon={Icon.Download}
      />
    </ActionPanel.Submenu>
  );
}

function CreateRepositoryForm({ onAddRepository }: { onAddRepository: (repoPath: string) => void }) {
  const { pop } = useNavigation();
  const [outputDirectory, setOutputDirectory] = useCachedState<string[]>("create-repository-output-directory", []);
  const [repositoryName, setRepositoryName] = useState<string>("");

  const handleSubmit = async (values: { outputDirectory: string[]; repositoryName: string }) => {
    if (!values.outputDirectory || values.outputDirectory.length === 0) {
      return;
    }
    const repoPath = join(values.outputDirectory[0], values.repositoryName);

    // Check if repository already exists
    if (existsSync(repoPath)) {
      await showFailureToast(new Error(`Directory "${repoPath}" already exists`), {
        title: "Repository already exists",
      });
      return;
    }

    try {
      // Create directory if it doesn't exist
      await fs.mkdir(repoPath, { recursive: true });

      // Initialize git repository
      const gitManager = new GitManager(repoPath);
      await gitManager.init();

      // Add repository to list
      await onAddRepository(repoPath);

      await showToast({
        style: Toast.Style.Success,
        title: "Repository created",
        message: `"${values.repositoryName}" initialized successfully`,
      });

      pop();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to create repository" });
    }
  };

  return (
    <Form
      navigationTitle="Create Git Repository"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Repository" icon={Icon.PlusCircle} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="outputDirectory"
        title="Output Directory"
        value={outputDirectory}
        error={outputDirectory.length === 0 ? "Required" : undefined}
        onChange={(paths: string[]) => setOutputDirectory(paths)}
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
      />
      <Form.TextField
        id="repositoryName"
        title="Repository Name"
        value={repositoryName}
        error={repositoryName.length === 0 ? "Required" : undefined}
        onChange={setRepositoryName}
        placeholder="my-repository"
      />
    </Form>
  );
}

function AddRepositoryForm({ onAddRepository }: { onAddRepository: (repoPath: string) => void }) {
  const { pop } = useNavigation();
  const [repositoryPaths, setRepositoryPaths] = useState<string[]>([]);

  // Compute validation errors for multiple repositories
  const validateRepositories = (paths: string[]): string | undefined => {
    if (paths.length === 0) {
      return "Required";
    }

    const invalidRepos: string[] = [];
    paths.forEach((path) => {
      try {
        GitManager.validateDirectory(path);
      } catch {
        const repoName = basename(path);
        invalidRepos.push(repoName);
      }
    });

    return invalidRepos.length > 0 ? `Invalid repositories:${invalidRepos.join(", ")}` : undefined;
  };

  const handleSubmit = async (values: { repositoryPath: string[] }) => {
    for (const repoPath of values.repositoryPath) {
      const repoName = basename(repoPath);

      onAddRepository(repoPath);

      await showToast({
        style: Toast.Style.Animated,
        title: `${repoName} added to recent list`,
      });
    }

    await showToast({
      style: Toast.Style.Success,
      title: repositoryPaths.length > 1 ? "All repositories added" : "Repository added",
    });
    pop();
  };

  return (
    <Form
      navigationTitle="Add Git Repository"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={repositoryPaths.length > 1 ? "Add Repositories" : "Add Repository"}
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="repositoryPath"
        title="Select Git Repository(s)"
        value={repositoryPaths}
        error={validateRepositories(repositoryPaths)}
        onChange={setRepositoryPaths}
        allowMultipleSelection={true}
        canChooseDirectories
        canChooseFiles={false}
      />
    </Form>
  );
}

function CloningRepositoryListItem({
  repo,
  onFinish,
  onKill,
  onRetry,
  onRemove,
  onOpen,
}: {
  repo: Repository;
  onFinish: () => void;
  onKill: () => void;
  onRetry: (cloningProcess: RepositoryCloningProcess) => void;
  onOpen: () => void;
  onRemove: () => void;
}) {
  if (repo.cloning === undefined) return undefined;

  const { gitManager } = useGitRepository(repo.path);
  if (!gitManager) return undefined;

  const progressState = useInterval<RepositoryCloningState | undefined>(500, () => {
    const progressState = gitManager.getClonningState(repo.cloning!);

    if (progressState?.exitCode === 0) {
      gitManager.cleanupCloningProcess(repo.cloning!);
      onFinish();
    }

    return progressState;
  });

  const icon: Image.ImageLike = (() => {
    if (progressState?.exitCode !== undefined && progressState?.exitCode !== 0) {
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
    }

    return { source: Icon.CircleProgress25, tintColor: Color.Blue };
  })();

  const accessories: List.Item.Accessory[] = (() => {
    if (progressState && progressState.exitCode !== undefined && progressState.exitCode !== 0) {
      return [
        {
          text: { value: "Failed to Clone", color: Color.Red },
          tooltip: `${progressState.exitCode}: ${progressState.output}`,
        },
      ];
    } else if (progressState && progressState.output.length > 0) {
      // Still cloning
      return [
        {
          text: { value: progressState.output, color: Color.SecondaryText },
        },
      ];
    } else {
      return [
        {
          text: { value: "Prepare to clone...", color: Color.SecondaryText },
        },
      ];
    }
  })();

  const handleKill = async () => {
    const confirmed = await confirmAlert({
      title: "Kill Clone Process",
      message: `Are you sure you want to stop cloning "${repo.name}"?`,
      primaryAction: {
        title: "Kill",
        style: Alert.ActionStyle.Destructive,
      },
      dismissAction: {
        title: "Continue",
      },
    });

    if (confirmed) {
      await gitManager.killCloningProcess(repo.cloning!);
      fs.rm(repo.path, { recursive: true, force: true });
      onKill();
    }
  };

  const handleRetry = async () => {
    await fs.rm(repo.path, { recursive: true, force: true });
    gitManager.cleanupCloningProcess(repo.cloning!);

    const cloningProcess = await GitManager.startCloneRepository(repo.cloning!.url, repo.path);
    onRetry(cloningProcess);
  };

  return (
    <List.Item
      id={repo.id}
      icon={icon}
      title={repo.name}
      accessories={accessories}
      actions={
        <ActionPanel>
          {progressState && progressState.exitCode !== undefined && progressState.exitCode !== 0 ? (
            <>
              <Action.Open title="Show Logs" icon={Icon.Document} target={repo.cloning!.stderrPath} />
              <Action
                title="Retry Clone"
                icon={Icon.Repeat}
                onAction={handleRetry}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              <Action
                title="Remove from List"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={onRemove}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
              />
              <Action.Trash paths={[repo.path]} onTrash={onRemove} />
            </>
          ) : (
            <>
              <Action title="Kill Process" icon={Icon.Stop} style={Action.Style.Destructive} onAction={handleKill} />
            </>
          )}

          <Action.CopyToClipboard title="Copy Clone URL" content={repo.cloning!.url} />
          <RepositoryDirectoryActions repositoryPath={repo.path} onOpen={onOpen} />
          <RepositoriesOrderActionsSection />
        </ActionPanel>
      }
    />
  );
}

function RepositoriesOrderActionsSection() {
  const { repositories } = useRepositoriesList();
  const { currentView: displayView, setCurrentView: setDisplayView } = useRepositoriesView(repositories);

  return (
    <ActionPanel.Section title="View">
      <ActionPanel.Submenu title="Sort by" icon={Icon.NumberList}>
        <Action
          title="Visit Date"
          icon={displayView.order === "visit-date" ? { source: Icon.Checkmark, tintColor: Color.Green } : Icon.Clock}
          onAction={() => setDisplayView({ ...displayView, order: "visit-date" })}
        />
        <Action
          title="Alphabetically"
          icon={
            displayView.order === "alphabetical" ? { source: Icon.Checkmark, tintColor: Color.Green } : Icon.Lowercase
          }
          onAction={() => setDisplayView({ ...displayView, order: "alphabetical" })}
        />
      </ActionPanel.Submenu>

      <ActionPanel.Submenu title="Group by" icon={Icon.List}>
        <Action
          title="None"
          icon={displayView.group === "none" ? { source: Icon.Checkmark, tintColor: Color.Green } : undefined}
          onAction={() => setDisplayView({ ...displayView, group: "none" })}
        />
        <Action
          title="Language"
          icon={displayView.group === "language" ? { source: Icon.Checkmark, tintColor: Color.Green } : Icon.Code}
          onAction={() => setDisplayView({ ...displayView, group: "language" })}
        />
        <Action
          title="Directory"
          icon={displayView.group === "parent" ? { source: Icon.Checkmark, tintColor: Color.Green } : Icon.Folder}
          onAction={() => setDisplayView({ ...displayView, group: "parent" })}
        />
      </ActionPanel.Submenu>
    </ActionPanel.Section>
  );
}

/**
 * Action for opening the attached links of a branch.
 */
function RepositoryAttachedLinksAction({ remotes }: { remotes: Record<string, Remote> }) {
  return (
    <ActionPanel.Submenu title="Open Link to" icon={Icon.Link} shortcut={{ modifiers: ["cmd"], key: "l" }}>
      {Object.values(remotes).map((remote) => (
        <RemoteWebPageAction.Base
          key={`remote-web-page-other-${remote.name}`}
          remote={remote}
          showTitle={Object.values(remotes).length > 1}
        />
      ))}
    </ActionPanel.Submenu>
  );
}
