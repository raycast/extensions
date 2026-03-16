import { ActionPanel, Action, Icon, List, Color, useNavigation } from "@raycast/api";
import { useCallback, useRef, useMemo, useState, useEffect } from "react";
import { useCachedPromise } from "@raycast/utils";
import { useTaskLogs } from "../hooks/useTaskLogs";
import { LogGroupList } from "./LogGroupList";
import { LogEntryDetail } from "./LogEntryDetail";
import { reauthorize } from "../lib/oauth";
import type { TaskWithPullRequest } from "../services/copilot";
import type { GroupedLogEntry, LogEntry } from "../services/events";
import { fetchRepositoryById } from "../services/repositories";
import { truncate, formatRelativeDate, getLogEntryIcon } from "../utils";

function getGroupedEntryIcon(entry: GroupedLogEntry): { source: Icon; tintColor?: Color } {
  switch (entry.kind) {
    case "subagent":
      return { source: Icon.TwoPeople, tintColor: Color.Orange };
    case "tool_group":
      return { source: Icon.Layers, tintColor: Color.Blue };
    case "standalone":
      return getLogEntryIcon(entry.entry);
  }
}

function getGroupedEntryTitle(entry: GroupedLogEntry): string {
  switch (entry.kind) {
    case "subagent":
      return `Subagent: ${entry.agentName}`;
    case "tool_group":
      return entry.title;
    case "standalone":
      return getStandaloneTitle(entry.entry);
  }
}

function getStandaloneTitle(entry: LogEntry): string {
  if (entry.type === "tool_call") {
    return getToolCallTitle(entry);
  }
  if (entry.type === "user_message") {
    return truncate(entry.content ?? "User message", 80);
  }
  if (entry.type === "assistant_message") {
    return truncate(entry.content ?? "Assistant message", 80);
  }
  if (entry.type === "error") {
    return `Error: ${truncate(entry.content ?? "", 60)}`;
  }
  return truncate(entry.content ?? "Info", 80);
}

/**
 * Map of tool names to human-readable titles, matching github-ui's Tool.tsx and TOOL_CALL_TITLES.
 * MCP tools (prefixed with server name) use descriptive titles.
 */
const TOOL_CALL_TITLES: Record<string, string> = {
  // Playwright
  "Playwright-browser_navigate": "Navigate Playwright web browser to a URL",
  "Playwright-browser_navigate_back": "Navigate back in Playwright web browser",
  "Playwright-browser_click": "Click element in Playwright web browser",
  "Playwright-browser_take_screenshot": "Take screenshot of Playwright web browser",
  "Playwright-browser_type": "Type in Playwright web browser",
  "Playwright-browser_wait_for": "Wait for text in Playwright web browser",
  "Playwright-browser_evaluate": "Run JavaScript in Playwright web browser",
  "Playwright-browser_snapshot": "Take snapshot of Playwright web browser",
  "Playwright-browser_resize": "Resize Playwright web browser window",
  "Playwright-browser_close": "Close Playwright web browser",
  "Playwright-browser_press_key": "Press key in Playwright web browser",
  "Playwright-browser_select_option": "Select option in Playwright web browser",
  "Playwright-browser_handle_dialog": "Interact with dialog in Playwright web browser",
  "Playwright-browser_console_messages": "Get console messages from Playwright web browser",
  "Playwright-browser_drag": "Drag mouse in Playwright web browser",
  "Playwright-browser_file_upload": "Upload file in Playwright web browser",
  "Playwright-browser_hover": "Hover mouse in Playwright web browser",
  "Playwright-browser_network_requests": "Get network requests from Playwright web browser",
  // GitHub MCP
  "github-mcp-server-get_file_contents": "Get file contents from GitHub",
  "github-mcp-server-get_pull_request": "Get pull request from GitHub",
  "github-mcp-server-get_issue": "Get issue from GitHub",
  "github-mcp-server-get_pull_request_files": "Get pull request changed files from GitHub",
  "github-mcp-server-list_pull_requests": "List pull requests on GitHub",
  "github-mcp-server-list_branches": "List branches on GitHub",
  "github-mcp-server-get_pull_request_diff": "Get pull request diff from GitHub",
  "github-mcp-server-get_pull_request_comments": "Get pull request comments from GitHub",
  "github-mcp-server-get_commit": "Get commit from GitHub",
  "github-mcp-server-search_repositories": "Search repositories on GitHub",
  "github-mcp-server-search_code": "Search code on GitHub",
  "github-mcp-server-get_issue_comments": "Get issue comments from GitHub",
  "github-mcp-server-list_issues": "List issues on GitHub",
  "github-mcp-server-search_pull_requests": "Search pull requests on GitHub",
  "github-mcp-server-list_commits": "List commits on GitHub",
  "github-mcp-server-get_pull_request_status": "Get pull request status from GitHub",
  "github-mcp-server-search_issues": "Search issues on GitHub",
  "github-mcp-server-get_pull_request_reviews": "Get pull request reviews from GitHub",
  "github-mcp-server-download_workflow_run_artifact": "Download GitHub Actions workflow run artifact",
  "github-mcp-server-get_job_logs": "Get GitHub Actions job logs",
  "github-mcp-server-get_workflow_run": "Get GitHub Actions workflow run",
  "github-mcp-server-get_workflow_run_logs": "Get GitHub Actions workflow run logs",
  "github-mcp-server-get_workflow_run_usage": "Get GitHub Actions workflow usage",
  "github-mcp-server-list_workflow_jobs": "List GitHub Actions workflow jobs",
  "github-mcp-server-list_workflow_run_artifacts": "List GitHub Actions workflow run artifacts",
  "github-mcp-server-list_workflow_runs": "List GitHub Actions workflow runs",
  "github-mcp-server-list_workflows": "List GitHub Actions workflows",
  "github-mcp-server-web_search": "Web Search",
  "github-mcp-server-bing_search": "Web Search",
  // Other first party tools
  "gh-advisory-database": "Check new dependencies against the GitHub Advisory Database",
  codeql_checker: "Run CodeQL security scan on changed files",
  code_review: "Review changes with Copilot code review",
  parallel_validation: "Check changes with Copilot code review and CodeQL",
  store_memory: "Store memory",
  reply_to_comment: "Reply to comment",
  propose_work: "Propose work",
};

export function getToolCallTitle(entry: LogEntry): string {
  const name = entry.toolName ?? "unknown";
  const args = entry.arguments;

  // Bash: use description or command
  if (name === "bash" || name === "powershell") {
    const shell = name === "bash" ? "Bash" : "PowerShell";
    if (args?.description) return truncate(String(args.description), 80);
    if (args?.command) return `Run ${shell} command`;
    return `Run ${shell} command`;
  }

  // Other shell tools: specific titles matching github-ui
  if (name === "write_bash" || name === "write_powershell") {
    const shell = name === "write_bash" ? "Bash" : "PowerShell";
    const sessionId = args?.shellId ?? args?.sessionId ?? "";
    return `Send input to ${shell} session ${sessionId}`;
  }
  if (name === "read_bash" || name === "read_powershell") {
    const shell = name === "read_bash" ? "Bash" : "PowerShell";
    const sessionId = args?.shellId ?? args?.sessionId ?? "";
    return `Read logs from ${shell} session ${sessionId}`;
  }
  if (name === "stop_bash" || name === "stop_powershell") {
    const shell = name === "stop_bash" ? "Bash" : "PowerShell";
    const sessionId = args?.shellId ?? args?.sessionId ?? "";
    return `Stop ${shell} session ${sessionId}`;
  }
  if (name === "list_bash" || name === "list_powershell") {
    const shell = name === "list_bash" ? "Bash" : "PowerShell";
    return `List ${shell} sessions`;
  }
  if (name === "async_bash") {
    const sessionId = args?.shellId ?? args?.sessionId ?? "";
    return `Start or send input to long-running Bash session ${sessionId}`;
  }
  if (name === "read_async_bash") {
    const sessionId = args?.shellId ?? args?.sessionId ?? "";
    return `View logs from long-running Bash session ${sessionId}`;
  }
  if (name === "stop_async_bash") {
    const sessionId = args?.shellId ?? args?.sessionId ?? "";
    return `Stop long-running Bash session ${sessionId}`;
  }

  // Search tools
  if (name === "grep" || name === "rg") {
    const pattern = args?.pattern ? String(args.pattern) : "";
    return pattern ? `Search: ${truncate(pattern, 70)}` : "Search";
  }
  if (name === "glob") {
    const pattern = args?.pattern ? String(args.pattern) : "";
    return pattern ? `Find files: ${truncate(pattern, 70)}` : "Find files";
  }
  if (name === "web_search" || name === "github-mcp-server-web_search" || name === "github-mcp-server-bing_search") {
    const query = args?.query ? String(args.query) : "";
    return query ? `Web Search: ${truncate(query, 70)}` : "Web Search";
  }
  if (name === "search_code_subagent") {
    const query = args?.query ? String(args.query) : "";
    return query ? `Search code: ${truncate(query, 70)}` : "Search code";
  }
  if (name === "web_fetch") {
    const url = args?.url ? String(args.url) : "";
    return url ? `Web Fetch: ${truncate(url, 70)}` : "Web Fetch";
  }

  // View tool
  if (name === "view") {
    if (args?.path) {
      const pathStr = String(args.path);
      const label = looksLikeDirectory(pathStr) ? "List" : "View";
      return `${label} ${trimFilePath(pathStr)}`;
    }
    return "View repository";
  }

  // Edit tools
  if (name === "str_replace_editor" || name === "str_replace" || name === "edit" || name === "apply_patch") {
    if (args?.path) return `Edit ${trimFilePath(String(args.path))}`;
    return "Edit";
  }

  // Create tool
  if (name === "create") {
    if (args?.path) return `Create ${trimFilePath(String(args.path))}`;
    return "Create";
  }

  // Think tool
  if (name === "think") return "Thought";

  // Skill tool
  if (name === "skill") {
    const skill = args?.skill ? String(args.skill) : "";
    return skill ? `Activate ${skill} skill` : "Activate skill";
  }

  // Report progress
  if (name === "report_progress") {
    if (args && "prDescription" in args) {
      const commitMsg = args.commitMessage ? String(args.commitMessage).split("\n")[0] : "";
      return commitMsg ? `Progress update: ${truncate(commitMsg, 60)}` : "Progress update";
    }
    const nextTask = args?.nextTask ? String(args.nextTask) : "";
    return nextTask ? `Start next task: ${truncate(nextTask, 60)}` : "Progress update";
  }

  // Commit changes
  if (name === "commit_changes") {
    const commitMsg = args?.commitMessage ? String(args.commitMessage).split("\n")[0] : "";
    return commitMsg ? `Commit changes: ${truncate(commitMsg, 60)}` : "Commit changes";
  }

  // Create pull request
  if (name === "create_pull_request") {
    const prefix = args?.draft ? "Create draft pull request" : "Create pull request";
    const title = args?.title ? String(args.title) : "";
    return title ? `${prefix}: ${truncate(title, 60)}` : prefix;
  }

  // Setup tools
  if (name === "run_custom_setup_step") {
    const stepName = args?.name ? String(args.name).trim() : "";
    return stepName ? `Run "${stepName}" custom setup step` : "Run custom setup step";
  }
  if (name === "run_setup") {
    const stepName = args?.name ? String(args.name).trim() : "";
    return stepName || "Setup";
  }

  // Check static title map (MCP tools, etc.)
  const staticTitle = TOOL_CALL_TITLES[name];
  if (staticTitle) return staticTitle;

  // Fallback: use args for context
  if (args?.path) return `${capitalize(name)} ${trimFilePath(String(args.path))}`;
  if (args?.name) return truncate(String(args.name), 70);
  if (args?.query) return `${name}: ${truncate(String(args.query), 60)}`;

  return name;
}

/** Heuristic: paths without a file extension or ending in / are likely directories */
function looksLikeDirectory(path: string): boolean {
  if (path.endsWith("/")) return true;
  const lastSegment = path.split("/").pop() ?? "";
  return !lastSegment.includes(".");
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Trim file paths to show only the repo-relative portion.
 * Strips the GitHub Actions runner workspace prefix
 * (e.g. /home/runner/work/repo/repo/src/foo.ts → src/foo.ts)
 * and also handles Windows-style paths.
 */
function trimFilePath(path: string): string {
  // Windows: D:\a\repo-name\repo-name\src\foo.ts → src/foo.ts
  const windowsMatch = path.match(/^[A-Za-z]:\\a\\[^\\]+\\[^\\]+\\(.*)$/);
  if (windowsMatch?.[1]) {
    return windowsMatch[1].replace(/\\/g, "/") || path;
  }

  // Unix: /home/runner/work/repo-name/repo-name/src/foo.ts → src/foo.ts
  if (path.startsWith("/home/runner/work/")) {
    const trimmed = path.replace("/home/runner/work/", "").split("/").slice(2).join("/");
    if (trimmed.length > 0) return trimmed;
  }

  // /tmp or other absolute paths: just show last few segments
  const parts = path.split("/");
  if (parts.length > 4) {
    return `…/${parts.slice(-3).join("/")}`;
  }

  return path;
}

function getGroupedEntrySubtitle(entry: GroupedLogEntry): string | undefined {
  if (entry.kind === "subagent") {
    return `${entry.entries.length} entries${entry.isPending ? " · Running" : ""}`;
  }
  return undefined;
}

function GroupedEntryItem({ id, entry }: { id: string; entry: GroupedLogEntry }) {
  const { push } = useNavigation();
  const icon = getGroupedEntryIcon(entry);
  const title = getGroupedEntryTitle(entry);
  const subtitle = getGroupedEntrySubtitle(entry);

  const onAction = () => {
    if (entry.kind === "subagent" || entry.kind === "tool_group") {
      push(<LogGroupList group={entry} />);
    } else {
      push(<LogEntryDetail entry={entry.entry} />);
    }
  };

  return (
    <List.Item
      id={id}
      title={title}
      subtitle={subtitle}
      icon={icon}
      actions={
        <ActionPanel>
          <Action title="View Details" icon={Icon.Eye} onAction={onAction} />
        </ActionPanel>
      }
    />
  );
}

export function TaskLogsList({ taskWithPullRequest }: { taskWithPullRequest: TaskWithPullRequest }) {
  const { task, pullRequest, repository } = taskWithPullRequest;
  const { sessionLogs, isLoading } = useTaskLogs(task.id);
  const taskTitle = pullRequest?.title ?? task.name ?? `Task ${task.id}`;

  // If repository wasn't resolved at list-fetch time, look it up by repo_id
  const { data: fetchedRepository } = useCachedPromise(fetchRepositoryById, [task.repo_id], {
    execute: !repository,
  });
  const effectiveRepository = repository ?? fetchedRepository ?? null;

  // Construct the task URL
  const taskUrl = effectiveRepository
    ? `https://github.com/${effectiveRepository.owner.login}/${effectiveRepository.name}/tasks/${task.id}`
    : undefined;

  // Build a map from original entry key → simple sequential ID (log-0, log-1, ...)
  // Raycast can't reliably match IDs containing base64 characters like / + =
  const { entryIdMap, lastItemId } = useMemo(() => {
    const map = new Map<string, string>();
    let counter = 0;
    let last: string | undefined;
    for (const sl of sessionLogs) {
      for (const entry of sl.groupedEntries) {
        const simpleId = `log-${counter++}`;
        map.set(getEntryKey(entry), simpleId);
        last = simpleId;
      }
    }
    return { entryIdMap: map, lastItemId: last };
  }, [sessionLogs]);

  // Raycast ignores selectedItemId when items go from 0→N in the same render.
  // We defer setting it by one tick so items exist before we try to select.
  const [deferredSelectedId, setDeferredSelectedId] = useState<string | undefined>(undefined);
  const userMovedAway = useRef(false);
  const prevLastItemId = useRef<string | undefined>(undefined);

  // When new data arrives with a new last item, schedule selection update
  useEffect(() => {
    if (!lastItemId) return;
    const isNewData = lastItemId !== prevLastItemId.current;
    prevLastItemId.current = lastItemId;

    if (isNewData && !userMovedAway.current) {
      // Brief delay so Raycast renders the new items before we select
      const timer = setTimeout(() => setDeferredSelectedId(lastItemId), 50);
      return () => clearTimeout(timer);
    }
  }, [lastItemId]);

  const selectedItemId = !userMovedAway.current ? deferredSelectedId : undefined;

  const handleSelectionChange = useCallback(
    (id: string | null) => {
      if (!id || deferredSelectedId === undefined) return;
      // Compare against the deferred ID (what we asked Raycast to select),
      // not lastItemId which may have changed in a newer render
      userMovedAway.current = id !== deferredSelectedId;
    },
    [deferredSelectedId],
  );

  return (
    <List
      isLoading={isLoading}
      navigationTitle={taskTitle}
      searchBarPlaceholder="Search logs..."
      selectedItemId={selectedItemId}
      onSelectionChange={handleSelectionChange}
      actions={
        <ActionPanel>
          {taskUrl && <Action.OpenInBrowser title="Open in Browser" url={taskUrl} />}
          <Action title="Log out" icon={Icon.Logout} onAction={reauthorize} />
        </ActionPanel>
      }
    >
      {sessionLogs.length === 0 && !isLoading && (
        <List.EmptyView
          icon={{ source: "copilot.svg", tintColor: Color.PrimaryText }}
          title="No Logs Found"
          description="No events found for this task"
          actions={
            <ActionPanel>
              {taskUrl && <Action.OpenInBrowser title="Open in Browser" url={taskUrl} />}
              <Action title="Log out" icon={Icon.Logout} onAction={reauthorize} />
            </ActionPanel>
          }
        />
      )}
      {sessionLogs.map((sessionLog) => (
        <List.Section
          key={sessionLog.session.id}
          title={sessionLog.session.name || "Session"}
          subtitle={`${formatSessionState(sessionLog.session.state)} · ${formatRelativeDate(new Date(sessionLog.session.created_at))}`}
        >
          {sessionLog.groupedEntries.map((entry) => {
            const originalKey = getEntryKey(entry);
            const id = entryIdMap.get(originalKey) ?? originalKey;
            return <GroupedEntryItem key={originalKey} id={id} entry={entry} />;
          })}
        </List.Section>
      ))}
    </List>
  );
}

function getEntryKey(entry: GroupedLogEntry): string {
  switch (entry.kind) {
    case "subagent":
      return entry.id;
    case "tool_group":
      return entry.id;
    case "standalone":
      return entry.entry.id;
  }
}

function formatSessionState(state: string): string {
  return state.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}
