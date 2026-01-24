import {
  Action,
  ActionPanel,
  Detail,
  List,
  Icon,
  showToast,
  Toast,
  popToRoot,
  Color,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { exec } from "child_process";
import { promisify } from "util";
import { captureContext, CapturedContext } from "./lib/context-capture";
import { executePrompt, ClaudeResponse } from "./lib/claude-cli";
import { launchClaudeCode } from "./lib/terminal";

const execPromise = promisify(exec);

// Enum for explicit change requirements (more robust than string matching)
type ChangeRequirement = "staged" | "unstaged" | "any" | "none";

interface GitAction {
  id: string;
  title: string;
  subtitle: string;
  icon: Icon;
  prompt: string;
  gitCommand: string;
  /** What type of changes this action requires */
  changeRequirement: ChangeRequirement;
  tintColor?: Color;
}

const GIT_ACTIONS: GitAction[] = [
  {
    id: "review-staged",
    title: "Review Staged Changes",
    subtitle: "Get Claude to review your staged changes",
    icon: Icon.MagnifyingGlass,
    prompt:
      "Review these staged changes. Look for bugs, potential issues, code quality concerns, and suggest improvements. Be specific about file names and line numbers.",
    gitCommand: "git diff --staged",
    changeRequirement: "staged",
    tintColor: Color.Blue,
  },
  {
    id: "write-commit",
    title: "Write Commit Message",
    subtitle: "Generate a commit message for staged changes",
    icon: Icon.Pencil,
    prompt: `Write a git commit message for these staged changes. Follow conventional commits format:

Format: <type>(<scope>): <description>

Types: feat, fix, docs, style, refactor, test, chore

Rules:
- Subject line under 50 characters
- Use imperative mood ("Add feature" not "Added feature")
- Add body if changes are complex
- Be specific about what changed and why

Return ONLY the commit message, nothing else.`,
    gitCommand: "git diff --staged",
    changeRequirement: "staged",
    tintColor: Color.Green,
  },
  {
    id: "explain-diff",
    title: "Explain Recent Changes",
    subtitle: "Explain the most recent commit",
    icon: Icon.QuestionMark,
    prompt:
      "Explain these changes in plain English. What was changed, why it might have been changed, and what effect it has. Be concise but thorough.",
    gitCommand: "git diff HEAD~1",
    changeRequirement: "none",
    tintColor: Color.Purple,
  },
  {
    id: "review-unstaged",
    title: "Review Unstaged Changes",
    subtitle: "Review all uncommitted changes",
    icon: Icon.Eye,
    prompt:
      "Review these unstaged changes. Identify any issues, suggest improvements, and note anything that looks incomplete or problematic.",
    gitCommand: "git diff",
    changeRequirement: "unstaged",
    tintColor: Color.Orange,
  },
  {
    id: "summarize-branch",
    title: "Summarize Branch Changes",
    subtitle: "Summarize all changes on current branch vs main",
    icon: Icon.List,
    prompt:
      "Summarize all the changes on this branch compared to main. Group by feature/area, highlight key changes, and provide a high-level overview suitable for a PR description.",
    gitCommand: "git diff main...HEAD",
    changeRequirement: "none",
    tintColor: Color.Yellow,
  },
];

export default function GitActions() {
  const [isLoading, setIsLoading] = useState(true);
  const [context, setContext] = useState<CapturedContext | null>(null);
  const [gitStatus, setGitStatus] = useState<{
    hasStagedChanges: boolean;
    hasUnstagedChanges: boolean;
    branch: string;
    isGitRepo: boolean;
  } | null>(null);

  useEffect(() => {
    async function init() {
      const ctx = await captureContext();
      setContext(ctx);

      if (ctx.projectPath) {
        const status = await checkGitStatus(ctx.projectPath);
        setGitStatus(status);
      } else {
        setGitStatus({
          hasStagedChanges: false,
          hasUnstagedChanges: false,
          branch: "",
          isGitRepo: false,
        });
      }

      setIsLoading(false);
    }
    init();
  }, []);

  if (isLoading) {
    return <List isLoading={true} />;
  }

  if (!context?.projectPath || !gitStatus?.isGitRepo) {
    return (
      <List>
        <List.EmptyView
          title="No Git Repository Detected"
          description="Open a project in VS Code or navigate to a git repository to use Git Actions"
          icon={Icon.ExclamationMark}
        />
      </List>
    );
  }

  return (
    <List searchBarPlaceholder="Search git actions...">
      <List.Section
        title={`${context.projectPath}`}
        subtitle={gitStatus.branch ? `on ${gitStatus.branch}` : undefined}
      >
        {GIT_ACTIONS.map((action) => {
          // Check if action is disabled based on explicit change requirement
          let isDisabled = false;
          let disabledReason: string | undefined;

          switch (action.changeRequirement) {
            case "staged":
              if (!gitStatus.hasStagedChanges) {
                isDisabled = true;
                disabledReason = "No staged changes";
              }
              break;
            case "unstaged":
              if (!gitStatus.hasUnstagedChanges) {
                isDisabled = true;
                disabledReason = "No unstaged changes";
              }
              break;
            case "any":
              if (
                !gitStatus.hasStagedChanges &&
                !gitStatus.hasUnstagedChanges
              ) {
                isDisabled = true;
                disabledReason = "No changes";
              }
              break;
            case "none":
              // No changes required
              break;
          }

          return (
            <GitActionItem
              key={action.id}
              action={action}
              projectPath={context.projectPath!}
              isDisabled={isDisabled}
              disabledReason={disabledReason}
            />
          );
        })}
      </List.Section>
    </List>
  );
}

function GitActionItem({
  action,
  projectPath,
  isDisabled,
  disabledReason,
}: {
  action: GitAction;
  projectPath: string;
  isDisabled: boolean;
  disabledReason?: string;
}) {
  const { push } = useNavigation();
  const [, setIsExecuting] = useState(false);

  async function executeAction() {
    if (isDisabled) {
      await showToast({
        style: Toast.Style.Failure,
        title: disabledReason || "Cannot execute action",
      });
      return;
    }

    setIsExecuting(true);

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Running git command...",
      });

      // Get the git diff
      const { stdout: diff } = await execPromise(action.gitCommand, {
        cwd: projectPath,
      });

      if (!diff.trim() && action.changeRequirement !== "none") {
        await showToast({
          style: Toast.Style.Failure,
          title: "No changes found",
          message: `${action.gitCommand} returned empty`,
        });
        setIsExecuting(false);
        return;
      }

      await showToast({
        style: Toast.Style.Animated,
        title: "Asking Claude Code...",
      });

      // Send to Claude
      const response = await executePrompt(action.prompt, {
        context: `Git diff output:\n\`\`\`diff\n${diff}\n\`\`\``,
        cwd: projectPath,
      });

      await showToast({ style: Toast.Style.Success, title: "Done" });

      // Push to result view
      push(
        <GitActionResult
          action={action}
          result={response}
          projectPath={projectPath}
        />,
      );
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsExecuting(false);
    }
  }

  const accessories: List.Item.Accessory[] = [];

  if (isDisabled && disabledReason) {
    accessories.push({
      tag: { value: disabledReason, color: Color.SecondaryText },
    });
  }

  return (
    <List.Item
      title={action.title}
      subtitle={action.subtitle}
      icon={{
        source: action.icon,
        tintColor: isDisabled ? Color.SecondaryText : action.tintColor,
      }}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action title="Execute" icon={Icon.Play} onAction={executeAction} />
          <Action
            title="Open Full Session"
            icon={Icon.Terminal}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
            onAction={async () => {
              await launchClaudeCode({ projectPath });
              await popToRoot();
            }}
          />
        </ActionPanel>
      }
    />
  );
}

function GitActionResult({
  action,
  result,
  projectPath,
}: {
  action: GitAction;
  result: ClaudeResponse;
  projectPath: string;
}) {
  const { pop } = useNavigation();
  const isCommitMessage = action.id === "write-commit";

  async function handleCommit() {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Creating commit...",
      });

      // Escape the message for shell
      const escapedMessage = result.result.replace(/'/g, "'\\''");
      await execPromise(`git commit -m '${escapedMessage}'`, {
        cwd: projectPath,
      });

      await showToast({ style: Toast.Style.Success, title: "Commit created!" });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Commit failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const markdown = `# ${action.title}\n\n${result.result}`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          {result.total_cost_usd && (
            <Detail.Metadata.Label
              title="Cost"
              text={`$${result.total_cost_usd.toFixed(4)}`}
            />
          )}
          {result.usage && (
            <Detail.Metadata.Label
              title="Tokens"
              text={`${result.usage.input_tokens} in / ${result.usage.output_tokens} out`}
            />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Actions">
            <Action.CopyToClipboard
              title="Copy Result"
              content={result.result}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            {isCommitMessage && (
              <Action
                title="Create Commit"
                icon={Icon.Checkmark}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
                onAction={handleCommit}
              />
            )}
            <Action.Paste
              title="Paste Result"
              content={result.result}
              shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Navigate">
            <Action
              title="Back to Actions"
              icon={Icon.ArrowLeft}
              shortcut={{ modifiers: ["cmd"], key: "[" }}
              onAction={pop}
            />
            <Action
              title="Continue in Terminal"
              icon={Icon.Terminal}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
              onAction={async () => {
                await launchClaudeCode({
                  projectPath,
                  sessionId: result.session_id,
                });
                await popToRoot();
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

async function checkGitStatus(projectPath: string): Promise<{
  hasStagedChanges: boolean;
  hasUnstagedChanges: boolean;
  branch: string;
  isGitRepo: boolean;
}> {
  try {
    // Check if it's a git repo
    await execPromise("git rev-parse --git-dir", { cwd: projectPath });

    const [staged, unstaged, branch] = await Promise.all([
      execPromise("git diff --staged --stat", { cwd: projectPath }).catch(
        () => ({ stdout: "" }),
      ),
      execPromise("git diff --stat", { cwd: projectPath }).catch(() => ({
        stdout: "",
      })),
      execPromise("git branch --show-current", { cwd: projectPath }).catch(
        () => ({ stdout: "" }),
      ),
    ]);

    return {
      hasStagedChanges: staged.stdout.trim().length > 0,
      hasUnstagedChanges: unstaged.stdout.trim().length > 0,
      branch: branch.stdout.trim(),
      isGitRepo: true,
    };
  } catch {
    return {
      hasStagedChanges: false,
      hasUnstagedChanges: false,
      branch: "",
      isGitRepo: false,
    };
  }
}
