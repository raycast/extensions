import {
  Action,
  ActionPanel,
  Alert,
  closeMainWindow,
  confirmAlert,
  Detail,
  Icon,
  open,
  PopToRootType,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { removeTask, updateTask, type Task } from "./storage";
import {
  getTaskStatus,
  getSkillOptionsForCommand,
  launchTask,
  readTaskOutput,
  stopTask,
} from "./task-manager";
import {
  execGhAsync,
  extractPrNumber,
  getGitRemoteBaseUrl,
  MERGE_METHOD_LABELS,
  replaceGitUrlBase,
  type MergeMethod,
} from "./git-utils";

async function checkPrOpen(prUrl: string, dir: string): Promise<boolean> {
  try {
    const stdout = await execGhAsync(
      ["pr", "view", prUrl, "--json", "state"],
      dir,
    );
    const data = JSON.parse(stdout);
    return data.state?.toLowerCase() === "open";
  } catch {
    return false;
  }
}

const REFRESH_INTERVAL_MS = 1000;
const LATEST_OUTPUT_LINE_LIMIT = 6;
const EMPTY_OUTPUT_TEXT = "(waiting for output...)";
const REVIEW_REPORT_DELIMITER = "!--------!";

export function extractReviewReport(output: string): string | null {
  const startIdx = output.indexOf(REVIEW_REPORT_DELIMITER);
  if (startIdx === -1) return null;
  const contentStart = startIdx + REVIEW_REPORT_DELIMITER.length;
  const endIdx = output.indexOf(REVIEW_REPORT_DELIMITER, contentStart);
  if (endIdx === -1) return null;
  const content = output.slice(contentStart, endIdx).trim();
  return content || null;
}

function getStatusLabel(status: Task["status"]): string {
  switch (status) {
    case "running":
      return "Running";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    case "stopped":
    case "canceled":
      return "Canceled";
  }
}

function escapeCodeFence(text: string): string {
  return text.replace(/```/g, "'''");
}

function getOutputText(output: string): string {
  const trimmedOutput = output.trimEnd();
  return trimmedOutput || EMPTY_OUTPUT_TEXT;
}

function getLatestOutputText(output: string): string {
  const lines = output
    .trimEnd()
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return EMPTY_OUTPUT_TEXT;
  }

  return lines.slice(-LATEST_OUTPUT_LINE_LIMIT).join("\n");
}

function formatDiffBlock(text: string): string {
  return `\`\`\`diff\n${escapeCodeFence(text)}\n\`\`\``;
}

export function extractGitUrl(task: Task, output: string): string | null {
  let url: string | null = null;

  if (task.command === "create-pr" || task.command === "review-pr") {
    const githubMatch = output.match(
      /https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/[0-9]+/,
    );
    if (githubMatch) {
      url = githubMatch[0];
    }

    if (!url) {
      const gitlabMatch = output.match(
        /https:\/\/gitlab\.com\/[^\s<>")']+\/-\/merge_requests\/[0-9]+/,
      );
      if (gitlabMatch) url = gitlabMatch[0];
    }

    if (!url) {
      const bitbucketMatch = output.match(
        /https:\/\/bitbucket\.org\/[^\s<>")']+\/pull-requests\/[0-9]+/,
      );
      if (bitbucketMatch) url = bitbucketMatch[0];
    }
  }
  if (task.command === "git-push") {
    const commitMatch = output.match(
      /https:\/\/(github\.com|gitlab\.com)\/[^\s<>")']+\/commit\/[0-9a-f]+/,
    );
    if (commitMatch) {
      url = commitMatch[0];
    }

    if (!url) {
      const bitbucketCommitMatch = output.match(
        /https:\/\/bitbucket\.org\/[^\s<>")']+\/commits\/[0-9a-f]+/,
      );
      if (bitbucketCommitMatch) url = bitbucketCommitMatch[0];
    }

    if (!url) {
      const gitHostMatch = output.match(
        /https:\/\/(github\.com|gitlab\.com|bitbucket\.org)\/[^\s<>")']+/g,
      );
      if (gitHostMatch) url = gitHostMatch[0].replace(/[.,;:)']*$/, "");
    }

    if (!url) {
      const sshMatch = output.match(
        /To\s+(?:git@)?(github\.com|gitlab\.com|bitbucket\.org):([^\s]+)/,
      );
      if (sshMatch) {
        const host = sshMatch[1];
        const path = sshMatch[2].replace(/\.git$/, "");
        url = `https://${host}/${path}`;
      }
    }
  }

  if (url) {
    const remoteBase = getGitRemoteBaseUrl(task.dir);
    if (remoteBase) {
      return replaceGitUrlBase(url, remoteBase);
    }
  }
  return url;
}

function formatStatusLine(status: Task["status"]): string {
  const prefix = status === "running" ? "+" : "-";
  return `${prefix} status: ${getStatusLabel(status)}`;
}

function formatMetadataLine(task: Task): string {
  const elapsed = Math.round((Date.now() - task.startTime) / 1000);
  const parts = [`branch: ${task.branch || "unknown"}`];

  if (task.targetBranch) {
    parts.push(`target: ${task.targetBranch}`);
  }

  parts.push(`dir: ${task.dir}`, `elapsed: ${elapsed}s`);

  return parts.join(" | ");
}

function formatTerminalMarkdown(
  task: Task,
  status: Task["status"],
  output: string,
): string {
  const lines = [
    task.label,
    formatStatusLine(status),
    formatMetadataLine(task),
  ];
  const blocks = [formatDiffBlock(lines.join("\n"))];

  if (status === "running") {
    blocks.push(formatDiffBlock(getLatestOutputText(output)));
  }

  blocks.push(formatDiffBlock(getOutputText(output)));

  return blocks.join("\n\n");
}

export function TaskDetail({
  task,
  allowClear = false,
  onRerunReview,
}: {
  task: Task;
  allowClear?: boolean;
  onRerunReview?: () => void;
}) {
  const { pop, push } = useNavigation();
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<Task["status"]>(task.status);
  const [hasAutoNavigated, setHasAutoNavigated] = useState(false);
  const [prOpen, setPrOpen] = useState(false);

  const isReviewPr = task.command === "review-pr" && !!task.prUrl;

  const checkReviewPrState = useCallback(async () => {
    if (!isReviewPr || !task.prUrl) return;
    const open = await checkPrOpen(task.prUrl, task.dir);
    setPrOpen(open);
  }, [isReviewPr, task.prUrl, task.dir]);

  const refresh = useCallback(async () => {
    const taskWithCurrentStatus = { ...task, status };
    const nextOutput = readTaskOutput(task);
    const nextStatus = getTaskStatus(taskWithCurrentStatus);

    setOutput(nextOutput);

    if (nextStatus !== status) {
      const wasRunning = status === "running";
      setStatus(nextStatus);
      await updateTask(task.id, { status: nextStatus });

      if (
        !hasAutoNavigated &&
        task.command === "review-pr" &&
        nextStatus === "completed" &&
        task.prUrl
      ) {
        const report = extractReviewReport(nextOutput);
        if (report) {
          setHasAutoNavigated(true);
          const prState = await checkPrOpen(task.prUrl, task.dir).then((o) =>
            o ? "open" : "closed",
          );
          push(
            <ReviewReportDetail
              markdown={report}
              gitUrl={task.prUrl}
              navigationTitle={task.label}
              prState={prState}
              dirPath={task.dir}
              onReview={onRerunReview}
            />,
          );
          return;
        }
      }

      if (wasRunning && nextStatus === "completed" && isReviewPr) {
        await checkReviewPrState();
      }
    }
  }, [
    status,
    task,
    hasAutoNavigated,
    push,
    isReviewPr,
    checkReviewPrState,
    onRerunReview,
  ]);

  useEffect(() => {
    void refresh();
    if (status !== "running") return;
    const timer = setInterval(() => void refresh(), REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    if (!isReviewPr) return;
    void checkReviewPrState();
  }, [isReviewPr, checkReviewPrState]);

  const running = status === "running";
  const finished = status === "completed";
  const gitUrl = finished ? extractGitUrl(task, output) : null;

  useEffect(() => {
    if (task.command !== "create-pr" || !gitUrl) {
      return;
    }
    void checkPrOpen(gitUrl, task.dir).then(setPrOpen);
  }, [task.command, task.dir, gitUrl]);

  const prNumber = extractPrNumber(task.prUrl || gitUrl || "");

  async function handleMergePR(method: MergeMethod) {
    if (!prNumber) return;
    const confirmed = await confirmAlert({
      title: `${MERGE_METHOD_LABELS[method]} PR #${prNumber}?`,
      message: task.label,
      primaryAction: {
        title: MERGE_METHOD_LABELS[method],
        style: Alert.ActionStyle.Default,
      },
      dismissAction: { title: "Cancel" },
    });
    if (!confirmed) return;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Merging PR...",
    });
    try {
      await execGhAsync(["pr", "merge", prNumber, method], task.dir);
      toast.style = Toast.Style.Success;
      toast.title = `PR #${prNumber} merged`;
      setPrOpen(false);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to merge PR";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  async function handleClosePR() {
    if (!prNumber) return;
    const confirmed = await confirmAlert({
      title: `Close PR #${prNumber}?`,
      message: task.label,
      primaryAction: { title: "Close", style: Alert.Style.Destructive },
      dismissAction: { title: "Cancel" },
    });
    if (!confirmed) return;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Closing PR...",
    });
    try {
      await execGhAsync(["pr", "close", prNumber], task.dir);
      toast.style = Toast.Style.Success;
      toast.title = `PR #${prNumber} closed`;
      setPrOpen(false);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to close PR";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  async function handleStop() {
    await showToast({ style: Toast.Style.Animated, title: "Stopping task..." });
    await stopTask({ ...task, status });
    setStatus("stopped");
    setOutput(readTaskOutput(task));
    await showToast({ style: Toast.Style.Success, title: "Task canceled" });
  }

  async function handleClear() {
    await removeTask(task.id);
    pop();
  }

  async function handleCloseMainWindow() {
    await closeMainWindow({
      clearRootSearch: true,
      popToRootType: PopToRootType.Immediate,
    });
  }

  const reviewReport =
    finished && task.command === "review-pr" && task.prUrl
      ? extractReviewReport(output)
      : null;
  const markdown = formatTerminalMarkdown(task, status, output);

  return (
    <Detail
      markdown={markdown}
      navigationTitle={task.label}
      actions={
        <ActionPanel>
          {reviewReport && task.prUrl && (
            <Action
              title="View Review Report"
              icon={Icon.Document}
              onAction={() =>
                push(
                  <ReviewReportDetail
                    markdown={reviewReport}
                    gitUrl={task.prUrl!}
                    navigationTitle={task.label}
                    prState={prOpen ? "open" : "closed"}
                    dirPath={task.dir}
                    onReview={onRerunReview}
                  />,
                )
              }
            />
          )}
          {!(reviewReport && task.prUrl) && (
            <Action
              title="Close Raycast"
              icon={Icon.Window}
              onAction={() => void handleCloseMainWindow()}
            />
          )}
          {finished && prOpen && prNumber && (
            <>
              <ActionPanel.Submenu
                title="Approve & Merge"
                icon={Icon.Check}
                shortcut={{ modifiers: ["cmd"], key: "y" }}
              >
                <Action
                  title="Merge"
                  icon={Icon.Check}
                  onAction={() => void handleMergePR("--merge")}
                />
                <Action
                  title="Rebase and Merge"
                  icon={Icon.ArrowRight}
                  onAction={() => void handleMergePR("--rebase")}
                />
                <Action
                  title="Squash and Merge"
                  icon={Icon.Layers}
                  onAction={() => void handleMergePR("--squash")}
                />
              </ActionPanel.Submenu>
              <Action
                title="Close Pr"
                icon={Icon.XMarkCircle}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={() => void handleClosePR()}
              />
            </>
          )}
          {gitUrl && (
            <>
              <Action.CopyToClipboard title="Copy Git Link" content={gitUrl} />
              <Action
                title="Open Git Link"
                icon={Icon.Link}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
                onAction={() => {
                  void open(gitUrl);
                  void handleCloseMainWindow();
                }}
              />
            </>
          )}
          {reviewReport && task.prUrl && (
            <Action
              title="Close Raycast"
              icon={Icon.Window}
              onAction={() => void handleCloseMainWindow()}
            />
          )}
          {task.command === "create-pr" && prOpen && gitUrl && (
            <Action
              title="Review Pr"
              icon={Icon.MagnifyingGlass}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              onAction={async () => {
                const toast = await showToast({
                  style: Toast.Style.Animated,
                  title: "Starting PR review...",
                });
                try {
                  const skillOpts =
                    await getSkillOptionsForCommand("review-pr");
                  const reviewTask = await launchTask(
                    "review-pr",
                    task.dir,
                    "review-pr",
                    { prUrl: gitUrl, ...skillOpts },
                  );
                  toast.style = Toast.Style.Success;
                  toast.title = "PR review task started";
                  push(
                    <TaskDetail
                      task={reviewTask}
                      onRerunReview={async () => {
                        const so = await getSkillOptionsForCommand("review-pr");
                        const t = await launchTask(
                          "review-pr",
                          task.dir,
                          "review-pr",
                          { prUrl: gitUrl, ...so },
                        );
                        push(<TaskDetail task={t} />);
                      }}
                    />,
                  );
                } catch (error) {
                  toast.style = Toast.Style.Failure;
                  toast.title = "Failed to start PR review";
                  toast.message =
                    error instanceof Error ? error.message : String(error);
                }
              }}
            />
          )}
          <Action.CopyToClipboard
            title="Copy Output"
            content={output}
            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={() => void refresh()}
          />
          {running && (
            <Action
              title="Stop Task"
              icon={Icon.Stop}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd"], key: "." }}
              onAction={() => void handleStop()}
            />
          )}
          {allowClear && !running && (
            <Action
              title="Clear Task & Back"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={() => void handleClear()}
            />
          )}
          <Action
            title="Back"
            icon={Icon.ArrowLeft}
            shortcut={{ modifiers: ["cmd"], key: "[" }}
            onAction={pop}
          />
        </ActionPanel>
      }
    />
  );
}

export function ReviewReportDetail({
  markdown,
  gitUrl,
  navigationTitle,
  prState,
  dirPath,
  onReview,
}: {
  markdown: string;
  gitUrl: string;
  navigationTitle: string;
  prState?: string;
  dirPath?: string;
  onReview?: () => void;
}) {
  const { pop } = useNavigation();

  async function handleCloseMainWindow() {
    await closeMainWindow({
      clearRootSearch: true,
      popToRootType: PopToRootType.Immediate,
    });
  }

  const canReview = prState === "open" && dirPath && onReview;
  const isOpen = prState === "open" && dirPath;
  const prNumber = extractPrNumber(gitUrl);

  async function handleMergePR(method: MergeMethod) {
    if (!prNumber || !dirPath) return;
    const confirmed = await confirmAlert({
      title: `${MERGE_METHOD_LABELS[method]} PR #${prNumber}?`,
      message: navigationTitle,
      primaryAction: {
        title: MERGE_METHOD_LABELS[method],
        style: Alert.ActionStyle.Default,
      },
      dismissAction: { title: "Cancel" },
    });
    if (!confirmed) return;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Merging PR...",
    });
    try {
      await execGhAsync(["pr", "merge", prNumber, method], dirPath);
      toast.style = Toast.Style.Success;
      toast.title = `PR #${prNumber} merged`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to merge PR";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  async function handleClosePR() {
    if (!prNumber || !dirPath) return;
    const confirmed = await confirmAlert({
      title: `Close PR #${prNumber}?`,
      message: navigationTitle,
      primaryAction: { title: "Close", style: Alert.ActionStyle.Destructive },
      dismissAction: { title: "Cancel" },
    });
    if (!confirmed) return;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Closing PR...",
    });
    try {
      await execGhAsync(["pr", "close", prNumber], dirPath);
      toast.style = Toast.Style.Success;
      toast.title = `PR #${prNumber} closed`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to close PR";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <Detail
      markdown={markdown}
      navigationTitle={navigationTitle}
      actions={
        <ActionPanel>
          <Action
            title="Close Raycast"
            icon={Icon.Window}
            onAction={() => void handleCloseMainWindow()}
          />
          <Action.CopyToClipboard title="Copy Pr Link" content={gitUrl} />
          <Action
            title="Open in Browser"
            icon={Icon.Globe}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
            onAction={() => {
              void open(gitUrl);
              void handleCloseMainWindow();
            }}
          />
          {canReview && (
            <Action
              title="Re-run Review"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={onReview}
            />
          )}
          {isOpen && prNumber && (
            <>
              <ActionPanel.Submenu
                title="Approve & Merge"
                icon={Icon.Check}
                shortcut={{ modifiers: ["cmd"], key: "y" }}
              >
                <Action
                  title="Merge"
                  icon={Icon.Check}
                  onAction={() => void handleMergePR("--merge")}
                />
                <Action
                  title="Rebase and Merge"
                  icon={Icon.ArrowRight}
                  onAction={() => void handleMergePR("--rebase")}
                />
                <Action
                  title="Squash and Merge"
                  icon={Icon.Layers}
                  onAction={() => void handleMergePR("--squash")}
                />
              </ActionPanel.Submenu>
              <Action
                title="Close Pr"
                icon={Icon.XMarkCircle}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={() => void handleClosePR()}
              />
            </>
          )}
          <Action
            title="Back"
            icon={Icon.ArrowLeft}
            shortcut={{ modifiers: ["cmd"], key: "[" }}
            onAction={pop}
          />
        </ActionPanel>
      }
    />
  );
}
