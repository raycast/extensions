import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Form,
  Icon,
  useNavigation,
  confirmAlert,
  open,
  LaunchType,
  getSelectedFinderItems,
  Color,
  getPreferenceValues,
  Alert,
} from "@raycast/api";
import { useState, useEffect, useMemo, useCallback } from "react";
import path from "path";
import { StorageManager } from "./storage";
import { GitUtils } from "./git-utils";
import { AIUtils } from "./ai-utils";
import { AddRepository } from "./add-repository";
import { Repository, GitStatus, Preferences, CommitMode, ICONS } from "./types";
import { execSync } from "child_process";
import type { Application } from "@raycast/api";

interface RepositoryListItemProps {
  repository: Repository;
  onUpdate: () => void;
  onAddRepository: () => void;
}

function openInIDE(path: string, ide?: Application) {
  let name = "Zed";
  if (ide) {
    name = ide.name;
  } else {
    // IDE not set, keep default
  }
  try {
    execSync(`open -a "${name}" "${path}"`, { timeout: 10000 });
  } catch {
    throw new Error(`Failed to open ${ide}, please ensure the command line tool is installed and configured correctly`);
  }
}

function RepositoryListItem({ repository, onUpdate, onAddRepository }: RepositoryListItemProps) {
  const { push } = useNavigation();

  // Use cached gitStatus to avoid repeated Git operations
  const gitStatus = useMemo<GitStatus>(() => {
    return (
      repository.gitStatus || {
        staged: 0,
        unstaged: 0,
        untracked: 0,
        ahead: 0,
        behind: 0,
      }
    );
  }, [repository.gitStatus]);

  async function handleCommit() {
    try {
      if (!repository.hasChanges) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No changes to commit",
          message: "There are no changes to commit in this repository",
        });
        return;
      }

      await StorageManager.incrementRepositoryUsage(repository.id);

      const preferences = getPreferenceValues<Preferences>();

      if (preferences.commitMode === CommitMode.AUTO) {
        await performAutoCommit(repository, preferences);
      } else if (preferences.commitMode === CommitMode.PREVIEW) {
        push(<CommitPreview repository={repository} preferences={preferences} onComplete={onUpdate} />);
      } else if (preferences.commitMode === CommitMode.QUICK) {
        push(<CommitPreview repository={repository} preferences={preferences} onComplete={onUpdate} quickAutoCommit />);
      }
    } catch (error) {
      console.error("Failed to handle commit:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Commit failed",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  }

  async function handlePinToggle() {
    await StorageManager.togglePinRepository(repository.id);
    onUpdate();
  }

  async function handleDelete() {
    if (
      await confirmAlert({
        title: "Delete Repository",
        message: `Are you sure you want to remove "${repository.displayName || repository.name}" from the list?`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      await StorageManager.removeRepository(repository.id);
      onUpdate();
    }
  }

  async function handleEdit() {
    push(<EditRepository repository={repository} onSave={onUpdate} />);
  }

  function getIcon() {
    if (repository.isPinned) return ICONS.PINNED;
    if (repository.hasChanges) return ICONS.CODE;
    return ICONS.SUCCESS;
  }

  function getIconColor() {
    if (repository.hasChanges) return Color.Orange;
    return Color.Green;
  }

  // Only show branch name, not path
  const subtitle = repository.branch;

  async function openPreferred() {
    const prefs = getPreferenceValues<{ terminalIde?: Application }>();
    const ide = prefs.terminalIde;
    try {
      openInIDE(repository.path, ide);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to open IDE",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  }

  return (
    <List.Item
      id={repository.id}
      title={repository.displayName || repository.name}
      icon={{ source: getIcon(), tintColor: getIconColor() }}
      accessories={[{ text: subtitle }].filter(Boolean)}
      detail={<List.Item.Detail metadata={getRepositoryMetadata(repository, gitStatus)} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Commit Changes"
              icon={ICONS.SUCCESS}
              onAction={handleCommit}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Add Repository"
              icon={Icon.Plus}
              onAction={onAddRepository}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
            <Action
              title={repository.isPinned ? "Unpin Repository" : "Pin Repository"}
              icon={ICONS.PINNED}
              onAction={handlePinToggle}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            />
            <Action
              title="Edit Repository"
              icon={Icon.Pencil}
              onAction={handleEdit}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
            />
            <Action
              title="Delete Repository"
              icon={Icon.Trash}
              onAction={handleDelete}
              shortcut={{ modifiers: ["cmd"], key: "backspace" }}
              style={Action.Style.Destructive}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Show in Finder"
              icon={ICONS.FOLDER}
              onAction={() => open(repository.path, LaunchType.UserInitiated)}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
            />
            <Action
              title="Open in Terminal/IDE"
              icon={ICONS.CODE}
              onAction={openPreferred}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function getRepositoryMetadata(repository: Repository, gitStatus: GitStatus | null) {
  const status = gitStatus || { staged: 0, unstaged: 0, untracked: 0, ahead: 0, behind: 0 };

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Repository Name" text={repository.displayName || repository.name} />

      <List.Item.Detail.Metadata.Label title="Full Path" text={repository.path} />

      <List.Item.Detail.Metadata.Label title="Current Branch" text={repository.branch} />

      <List.Item.Detail.Metadata.Label title="Last Used" text={new Date(repository.lastUsed).toLocaleString()} />

      <List.Item.Detail.Metadata.Label title="Usage Count" text={repository.useCount.toString()} />

      <List.Item.Detail.Metadata.Separator />

      <List.Item.Detail.Metadata.Label
        title="Git Status"
        icon={
          repository.hasChanges
            ? { source: Icon.Circle, tintColor: Color.Red }
            : { source: Icon.Checkmark, tintColor: Color.Green }
        }
        text={repository.hasChanges ? `${repository.changedFilesCount} changes` : "Clean"}
      />

      <List.Item.Detail.Metadata.Label
        title="Staged Files"
        text={status.staged.toString()}
        icon={status.staged > 0 ? { source: Icon.Circle, tintColor: Color.Green } : Icon.Circle}
      />

      <List.Item.Detail.Metadata.Label
        title="Unstaged Files"
        text={status.unstaged.toString()}
        icon={status.unstaged > 0 ? { source: Icon.Circle, tintColor: Color.Orange } : Icon.Circle}
      />

      <List.Item.Detail.Metadata.Label
        title="Untracked Files"
        text={status.untracked.toString()}
        icon={status.untracked > 0 ? { source: Icon.Circle, tintColor: Color.Blue } : Icon.Circle}
      />

      <List.Item.Detail.Metadata.Label title="Ahead/Behind" text={`↑${status.ahead} ↓${status.behind}`} />

      <List.Item.Detail.Metadata.Separator />

      {repository.lastCommit && (
        <>
          <List.Item.Detail.Metadata.Label
            title="Latest Commit"
            text={repository.lastCommit.message}
            icon={ICONS.INFO}
          />
          <List.Item.Detail.Metadata.Label title="Commit Author" text={repository.lastCommit.author} />
          <List.Item.Detail.Metadata.Label
            title="Commit Date"
            text={new Date(repository.lastCommit.date).toLocaleString()}
          />
        </>
      )}

      {repository.context && (
        <>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Repository Context" text={repository.context} icon={ICONS.INFO} />
        </>
      )}
    </List.Item.Detail.Metadata>
  );
}

interface EditRepositoryProps {
  repository: Repository;
  onSave: () => void;
}

function EditRepository({ repository, onSave }: EditRepositoryProps) {
  const [displayName, setDisplayName] = useState(repository.displayName || "");
  const [context, setContext] = useState(repository.context || "");
  const [isGenerating, setIsGenerating] = useState(false);
  const { pop } = useNavigation();

  async function handleSubmit() {
    try {
      await StorageManager.updateRepository(repository.id, {
        displayName: displayName || undefined,
        context: context || undefined,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Repository updated",
      });

      onSave();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update repository",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  }

  async function handleGenerateContext() {
    try {
      setIsGenerating(true);
      await showToast({
        style: Toast.Style.Animated,
        title: "Generating context with AI...",
      });

      // Gather repository information
      const [readmeContent, fileStructure, recentCommits] = await Promise.all([
        GitUtils.getReadmeContent(repository.path),
        GitUtils.getFileStructure(repository.path),
        GitUtils.getRecentCommits(repository.path, 10),
      ]);

      const recentCommitsStr = recentCommits.map((c) => `${c.hash} ${c.message}`).join("\n");

      const generatedContext = await AIUtils.generateRepositoryContext({
        repoName: repository.displayName || repository.name,
        repoPath: repository.path,
        readmeContent,
        fileStructure,
        recentCommits: recentCommitsStr,
      });

      setContext(generatedContext);

      await showToast({
        style: Toast.Style.Success,
        title: "Context generated",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to generate context",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Form
      navigationTitle={`Edit ${repository.name}`}
      isLoading={isGenerating}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" onSubmit={handleSubmit} icon={Icon.Check} />
          <Action
            title="Generate Context with AI"
            icon={Icon.Stars}
            onAction={handleGenerateContext}
            shortcut={{ modifiers: ["cmd"], key: "g" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="displayName"
        title="Display Name"
        placeholder={repository.name}
        value={displayName}
        onChange={setDisplayName}
      />
      <Form.TextArea
        id="context"
        title="Repository Context"
        placeholder="Describe what this repository is about to help AI generate better commit messages"
        value={context}
        onChange={setContext}
      />
    </Form>
  );
}

interface CommitPreviewProps {
  repository: Repository;
  preferences: Preferences;
  onComplete: () => void;
  quickAutoCommit?: boolean;
}

function CommitPreview({ repository, preferences, onComplete, quickAutoCommit }: CommitPreviewProps) {
  const [commitMessage, setCommitMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [regenerateInstruction, setRegenerateInstruction] = useState("");
  const [autoCommitActive, setAutoCommitActive] = useState<boolean>(!!quickAutoCommit);
  const [countdown, setCountdown] = useState<number>(0);
  const { pop } = useNavigation();

  useEffect(() => {
    generateCommitMessage();
  }, []);

  async function generateCommitMessage() {
    try {
      setIsLoading(true);
      const autoStage = preferences.autoStageAllFiles ?? false;
      const diff = autoStage
        ? await GitUtils.getCombinedDiff(repository.path)
        : await GitUtils.getStagedDiff(repository.path);

      if (!diff.trim()) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No changes to commit",
        });
        pop();
        return;
      }

      const aiMessage = await AIUtils.generateCommitMessage({
        diff,
        style: preferences.commitStyle,
        context: repository.context,
        customInstructions: preferences.customInstructions,
        repoName: repository.displayName || repository.name,
      });

      setCommitMessage(aiMessage.message);
    } catch (error) {
      console.error("Failed to generate commit message:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to generate commit message",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
      pop();
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!isLoading && autoCommitActive && commitMessage.trim()) {
      setCountdown(5);
      const interval = setInterval(() => setCountdown((c) => c - 1), 1000);
      const timeout = setTimeout(async () => {
        clearInterval(interval);
        if (autoCommitActive) {
          await handleCommit();
        }
      }, 5000);
      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [isLoading, autoCommitActive, commitMessage]);

  async function handleCommit() {
    try {
      const autoStage = preferences.autoStageAllFiles ?? false;
      if (autoStage) {
        try {
          await GitUtils.stageAllFiles(repository.path);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (message.includes("index.lock")) {
            const confirmed = await confirmAlert({
              title: "Unlock Git Repository",
              message: "Detected a Git index.lock. Close any Git operations. Unlock and retry?",
              primaryAction: { title: "Unlock and Retry", style: Alert.ActionStyle.Destructive },
            });
            if (confirmed) {
              await GitUtils.unlockRepository(repository.path);
              await GitUtils.stageAllFiles(repository.path);
            } else {
              throw error;
            }
          } else {
            throw error;
          }
        }
      } else {
        const staged = await GitUtils.getStagedDiff(repository.path);
        if (!staged.trim()) {
          await showToast({ style: Toast.Style.Failure, title: "No staged changes to commit" });
          return;
        }
      }
      await GitUtils.commit(repository.path, commitMessage);

      // Auto push if enabled
      if (preferences.autoPushAfterCommit) {
        try {
          await showToast({
            style: Toast.Style.Animated,
            title: "Pushing to remote...",
          });
          await GitUtils.push(repository.path);
          await showToast({
            style: Toast.Style.Success,
            title: "Commit and push successful",
            message: commitMessage,
          });
        } catch (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Commit successful, but push failed",
            message: error instanceof Error ? error.message : "Unknown error occurred",
          });
        }
      } else {
        await showToast({
          style: Toast.Style.Success,
          title: "Commit successful",
          message: commitMessage,
        });
      }

      onComplete();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Commit failed",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  }

  async function handleRegenerate() {
    try {
      setIsLoading(true);
      const autoStage = preferences.autoStageAllFiles ?? false;
      const diff = autoStage
        ? await GitUtils.getCombinedDiff(repository.path)
        : await GitUtils.getStagedDiff(repository.path);
      const aiMessage = await AIUtils.regenerateCommitMessage({
        diff,
        style: preferences.commitStyle,
        context: repository.context,
        customInstructions: preferences.customInstructions,
        repoName: repository.displayName || repository.name,
        previousMessage: commitMessage,
        regenerateInstruction,
      });

      setCommitMessage(aiMessage.message);
      setRegenerateInstruction("");
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to regenerate commit message",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      navigationTitle={`Commit to ${repository.displayName || repository.name}`}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {autoCommitActive ? (
            <Action
              title="Cancel Auto Commit"
              icon={Icon.XMarkCircle}
              onAction={() => setAutoCommitActive(false)}
              shortcut={{ modifiers: [], key: "return" }}
            />
          ) : (
            <>
              <Action
                title={regenerateInstruction ? "Quick Regenerate" : "Quick Commit"}
                icon={regenerateInstruction ? Icon.ArrowClockwise : Icon.Check}
                onAction={() => (regenerateInstruction ? handleRegenerate() : handleCommit())}
                shortcut={{ modifiers: [], key: "return" }}
              />
              <Action.SubmitForm title="Commit" onSubmit={handleCommit} icon={Icon.Check} />
              <Action
                title="Regenerate Message"
                icon={Icon.ArrowClockwise}
                onAction={handleRegenerate}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </>
          )}
        </ActionPanel>
      }
    >
      {autoCommitActive && countdown > 0 && (
        <Form.Description text={`Auto commit in ${countdown} seconds. Press Enter to cancel.`} />
      )}
      <Form.TextArea
        id="commitMessage"
        title="Commit Message"
        placeholder="Enter commit message..."
        value={commitMessage}
        onChange={setCommitMessage}
        info="The commit will use this message directly, ignoring the regeneration instruction below."
      />

      <Form.Separator />
      <Form.TextArea
        id="regenerateInstruction"
        title="Regenerate Instruction"
        placeholder="e.g., Focus on API changes; keep under 50 chars; summarise business impact"
        value={regenerateInstruction}
        onChange={setRegenerateInstruction}
        info="Only used for regeneration; leave empty to use custom instructions from preferences."
      />
    </Form>
  );
}

async function performAutoCommit(repository: Repository, preferences: Preferences) {
  try {
    const autoStage = preferences.autoStageAllFiles ?? false;
    if (autoStage) {
      try {
        await GitUtils.stageAllFiles(repository.path);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("index.lock")) {
          const confirmed = await confirmAlert({
            title: "Unlock Git Repository",
            message: "Detected a Git index.lock. Close any Git operations. Unlock and retry?",
            primaryAction: { title: "Unlock and Retry", style: Alert.ActionStyle.Destructive },
          });
          if (confirmed) {
            await GitUtils.unlockRepository(repository.path);
            await GitUtils.stageAllFiles(repository.path);
          } else {
            throw error;
          }
        } else {
          throw error;
        }
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("index.lock")) {
      const confirmed = await confirmAlert({
        title: "Unlock Git Repository",
        message: "Detected a Git index.lock. Close any Git operations. Unlock and retry?",
        primaryAction: { title: "Unlock and Retry", style: Alert.ActionStyle.Destructive },
      });
      if (confirmed) {
        await GitUtils.unlockRepository(repository.path);
        await GitUtils.stageAllFiles(repository.path);
      } else {
        throw error;
      }
    } else {
      throw error;
    }
  }
  const autoStage = preferences.autoStageAllFiles ?? false;
  const diff = autoStage
    ? await GitUtils.getCombinedDiff(repository.path)
    : await GitUtils.getStagedDiff(repository.path);

  if (!diff.trim()) {
    throw new Error("No changes to commit");
  }

  const aiMessage = await AIUtils.generateCommitMessage({
    diff,
    style: preferences.commitStyle,
    context: repository.context,
    customInstructions: preferences.customInstructions,
    repoName: repository.displayName || repository.name,
  });

  await GitUtils.commit(repository.path, aiMessage.message);

  // Auto push if enabled
  if (preferences.autoPushAfterCommit) {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Pushing to remote...",
      });
      await GitUtils.push(repository.path);
      await showToast({
        style: Toast.Style.Success,
        title: "Commit and push successful",
        message: aiMessage.message,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Commit successful, but push failed",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  } else {
    await showToast({
      style: Toast.Style.Success,
      title: "Commit successful",
      message: aiMessage.message,
    });
  }
}

// Concurrency control utility function: limit the number of async tasks executing simultaneously
async function pLimit<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: Promise<T>[] = [];
  const executing: Promise<void>[] = [];

  for (const task of tasks) {
    const p: Promise<T> = Promise.resolve().then(() => task());
    results.push(p);

    if (limit <= tasks.length) {
      const e: Promise<void> = p.then(() => {
        executing.splice(executing.indexOf(e), 1);
      }) as Promise<void>;
      executing.push(e);

      if (executing.length >= limit) {
        await Promise.race(executing);
      }
    }
  }

  return Promise.all(results);
}

// removed quick commit flow, handled via preview with auto-commit

export default function QuickGitCommit() {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [initialPath, setInitialPath] = useState<string | undefined>(undefined);
  const { push } = useNavigation();

  useEffect(() => {
    loadRepositories();
    checkSelectedFolder();
  }, []);

  async function checkSelectedFolder() {
    try {
      const selectedItems = await getSelectedFinderItems();
      if (selectedItems.length > 0 && selectedItems[0].path) {
        const selectedPath = selectedItems[0].path;
        const isGitRepo = await GitUtils.isGitRepository(selectedPath);
        if (isGitRepo) {
          setInitialPath(selectedPath);
        }
      }
    } catch {
      // Ignore errors - user might not have anything selected
    }
  }

  const loadRepositories = useCallback(async () => {
    try {
      setIsLoading(true);
      const repos = await StorageManager.getRepositories();
      setRepositories(repos);
      setIsLoading(false);

      // Batch collect all updates to avoid multiple setRepositories calls
      const updatesMap = new Map<string, Partial<Repository>>();

      // Sort repositories by priority: pinned > hasChanges > others
      const sortedRepos = [...repos].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        if (a.hasChanges && !b.hasChanges) return -1;
        if (!a.hasChanges && b.hasChanges) return 1;
        return 0;
      });

      // Create task array with concurrency control (max 3 Git operations at a time)
      const tasks = sortedRepos.map((repo) => async () => {
        try {
          const info = await GitUtils.getRepositoryInfo(repo.path);
          const updates: Partial<Repository> = {
            branch: info.branch || repo.branch,
            hasChanges: !!info.hasChanges,
            changedFilesCount: info.changedFilesCount || 0,
            lastCommit: info.lastCommit || repo.lastCommit,
            gitStatus: info.gitStatus, // Save detailed Git status
          };
          await StorageManager.updateRepository(repo.id, updates);
          updatesMap.set(repo.id, updates);
        } catch (e) {
          void e;
        }
      });

      // Concurrency control: max 3 repositories at a time
      await pLimit(tasks, 3);

      // Update all repository statuses at once
      if (updatesMap.size > 0) {
        setRepositories((prev) =>
          prev.map((r) => {
            const updates = updatesMap.get(r.id);
            return updates ? { ...r, ...updates } : r;
          }),
        );
      }
    } catch (error) {
      console.error("Failed to load repositories:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load repositories",
      });
      setIsLoading(false);
    }
  }, []);

  const handleAddRepository = useCallback(() => {
    push(<AddRepository onComplete={loadRepositories} initialPath={initialPath} />);
  }, [initialPath, loadRepositories, push]);

  const filteredRepositories = useMemo(
    () =>
      repositories.filter(
        (repo) =>
          (repo.displayName || repo.name).toLowerCase().includes(searchText.toLowerCase()) ||
          repo.path.toLowerCase().includes(searchText.toLowerCase()),
      ),
    [repositories, searchText],
  );

  const pinnedRepos = useMemo(() => filteredRepositories.filter((repo) => repo.isPinned), [filteredRepositories]);
  const reposWithChanges = useMemo(
    () => filteredRepositories.filter((repo) => repo.hasChanges && !repo.isPinned),
    [filteredRepositories],
  );
  const cleanRepos = useMemo(
    () => filteredRepositories.filter((repo) => !repo.hasChanges && !repo.isPinned),
    [filteredRepositories],
  );

  const listActions = useMemo(
    () => (
      <ActionPanel>
        <Action
          title="Add Repository"
          icon={Icon.Plus}
          onAction={handleAddRepository}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
        />
      </ActionPanel>
    ),
    [handleAddRepository],
  );

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search repositories..."
      isShowingDetail
      actions={listActions}
    >
      {pinnedRepos.length > 0 && (
        <List.Section title="Pinned">
          {pinnedRepos.map((repo) => (
            <RepositoryListItem
              key={repo.id}
              repository={repo}
              onUpdate={loadRepositories}
              onAddRepository={handleAddRepository}
            />
          ))}
        </List.Section>
      )}

      {reposWithChanges.length > 0 && (
        <List.Section title="With Changes">
          {reposWithChanges.map((repo) => (
            <RepositoryListItem
              key={repo.id}
              repository={repo}
              onUpdate={loadRepositories}
              onAddRepository={handleAddRepository}
            />
          ))}
        </List.Section>
      )}

      {cleanRepos.length > 0 && (
        <List.Section title="No Changes">
          {cleanRepos.map((repo) => (
            <RepositoryListItem
              key={repo.id}
              repository={repo}
              onUpdate={loadRepositories}
              onAddRepository={handleAddRepository}
            />
          ))}
        </List.Section>
      )}

      {filteredRepositories.length === 0 && !isLoading && (
        <List.EmptyView
          icon={ICONS.GIT}
          title="No repositories found"
          description={
            initialPath
              ? `Selected folder "${path.basename(initialPath)}" is ready to add as a repository`
              : "Add a repository to get started"
          }
          actions={listActions}
        />
      )}
    </List>
  );
}
