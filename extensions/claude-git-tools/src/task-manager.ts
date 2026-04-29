import { showToast, Toast } from "@raycast/api";
import { execFileSync, spawn, type ChildProcess } from "child_process";
import {
  appendFileSync,
  writeFileSync,
  readFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  unlinkSync,
} from "fs";
import { join } from "path";
import { tmpdir, homedir } from "os";
import {
  addTask,
  getModel,
  getSkillPath,
  removeTask,
  updateTask,
  type Task,
} from "./storage";
import { dirFromPath } from "./git-utils";

export type TaskCommand = "git-push" | "create-pr" | "review-pr";

const TASK_DIR = join(tmpdir(), "claude-git-tools-tasks");
const FORMATTER_FILE = join(TASK_DIR, "format-agent-output.js");
const STALE_TASK_MAX_AGE_MS = 10 * 60 * 1000;

let formatterWritten = false;

interface TaskOptions {
  targetBranch?: string;
  prUrl?: string;
  skillName?: string;
  skillDir?: string;
}

export function skillPathToName(path: string): string {
  const base = path.split("/").pop() || "";
  return base.replace(/\.md$/i, "");
}

export async function getSkillOptionsForCommand(
  command: TaskCommand,
): Promise<{ skillName?: string; skillDir?: string }> {
  const path = await getSkillPath(command);
  if (!path) return {};
  const name = skillPathToName(path);
  const dir = dirFromPath(path);
  return { skillName: name, skillDir: dir };
}

function ensureTaskDir() {
  if (!existsSync(TASK_DIR)) mkdirSync(TASK_DIR, { recursive: true });
  if (!formatterWritten) {
    writeFileSync(FORMATTER_FILE, outputFormatterScript);
    formatterWritten = true;
  }
}

function shellQuote(value: string): string {
  return "'" + value.replace(/'/g, "'\\''") + "'";
}

function requireTargetBranch(options: TaskOptions): string {
  const targetBranch = options.targetBranch?.trim();
  if (!targetBranch) {
    throw new Error("Target branch is required for create-pr");
  }
  return targetBranch;
}

function buildClaudeCommand(
  command: TaskCommand,
  options: TaskOptions,
  model: string,
): string | null {
  let skillFile = "";
  if (options.skillDir && options.skillName) {
    const candidate = join(options.skillDir, `${options.skillName}.md`);
    if (existsSync(candidate)) {
      skillFile = candidate;
    }
  }

  if (!skillFile) {
    return null;
  }

  let prompt: string;
  if (command === "git-push") {
    prompt = "Execute the task described in the appended system prompt";
  } else if (command === "create-pr") {
    const branch = requireTargetBranch(options);
    prompt = `$ARGUMENTS=${branch}`;
  } else {
    const prUrl = options.prUrl || "";
    prompt = `$ARGUMENTS=${prUrl}`;
  }

  const allowedTools = [
    "Bash(git:*)",
    "Bash(gh:*)",
    "Bash(ls:*)",
    "Bash(cat:*)",
    "Bash(find:*)",
    "Bash(grep:*)",
    "Bash(mkdir:*)",
    "Bash(cp:*)",
    "Bash(wc:*)",
    "Read",
    "Write",
    "Edit",
    "Grep",
    "Glob",
  ].join(",");

  const parts = [
    "claude",
    "-p",
    "--allowedTools",
    shellQuote(allowedTools),
    "--verbose",
    "--model",
    shellQuote(model),
    "--output-format",
    "stream-json",
    "--include-partial-messages",
    "--include-hook-events",
  ];

  if (skillFile) {
    parts.push("--append-system-prompt-file", shellQuote(skillFile));
  }

  parts.push("--", shellQuote(prompt));

  return parts.join(" ");
}

function getTaskFileId(name: string): string | null {
  const match = name.match(/^([a-z0-9]+)\.(log|pid|exit|fifo)$/i);
  return match ? match[1] : null;
}

function reapStaleTaskProcesses() {
  if (!existsSync(TASK_DIR)) return;

  const now = Date.now();
  const staleIds = new Set<string>();

  for (const name of readdirSync(TASK_DIR)) {
    const taskId = getTaskFileId(name);
    if (!taskId) continue;

    const path = join(TASK_DIR, name);
    let isOld = false;
    try {
      isOld = now - statSync(path).mtimeMs > STALE_TASK_MAX_AGE_MS;
    } catch {
      continue;
    }
    if (!isOld) continue;

    if (name.endsWith(".fifo")) {
      staleIds.add(taskId);
      continue;
    }

    if (!name.endsWith(".pid")) continue;

    try {
      if (!readFileSync(path, "utf-8").trim()) {
        staleIds.add(taskId);
      }
    } catch {
      staleIds.add(taskId);
    }
  }

  if (!staleIds.size) return;

  let processList = "";
  try {
    processList = execFileSync("ps", ["-axo", "pid=,command="], {
      encoding: "utf-8",
      timeout: 5000,
    });
  } catch {
    processList = "";
  }

  for (const line of processList.split("\n")) {
    const match = line.match(/^\s*(\d+)\s+(.*)$/);
    if (!match) continue;

    const pid = Number(match[1]);
    const command = match[2];
    if (!Number.isInteger(pid) || pid <= 0 || pid === process.pid) continue;
    if (!command.includes(TASK_DIR)) continue;
    if (![...staleIds].some((taskId) => command.includes(taskId))) continue;

    try {
      process.kill(pid, "SIGTERM");
    } catch {
      continue;
    }

    try {
      process.kill(pid, 0);
      process.kill(pid, "SIGKILL");
    } catch {
      // The process exited after SIGTERM.
    }
  }

  for (const taskId of staleIds) {
    const fifoPath = join(TASK_DIR, `${taskId}.fifo`);
    if (!existsSync(fifoPath)) continue;
    try {
      unlinkSync(fifoPath);
    } catch {
      // Best effort cleanup for legacy FIFO-based launches.
    }
  }
}

function getCurrentBranch(dir: string): string {
  try {
    return execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd: dir,
      encoding: "utf-8",
      timeout: 5000,
    }).trim();
  } catch {
    return "unknown";
  }
}

const outputFormatterScript = String.raw`
const readline = require("readline");

const claudeToolUses = new Set();
const claudeToolResults = new Set();

function asText(value) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(asText).filter(Boolean).join("");
  if (!value || typeof value !== "object") return "";
  if (typeof value.text === "string") return value.text;
  if (typeof value.content === "string") return value.content;
  if (Array.isArray(value.content)) return value.content.map(asText).filter(Boolean).join("");
  if (typeof value.output === "string") return value.output;
  if (typeof value.stdout === "string") return value.stdout;
  if (typeof value.stderr === "string") return value.stderr;
  if (typeof value.message === "string") return value.message;
  if (value.delta) return asText(value.delta);
  if (value.result) return asText(value.result);
  return "";
}

function toolCommandFromInput(input) {
  if (typeof input === "string") return input;
  if (!input || typeof input !== "object") return "";
  return input.command || input.cmd || input.description || input.query || input.prompt || "";
}

function formatToolUse(part) {
  const name = part.name || part.tool_name || part.tool || "tool";
  const command = toolCommandFromInput(
    part.input || part.arguments || part.parameters || part.state?.input || part.payload,
  );
  if (!command) return "";

  return "\n▸ " + name + ": " + command + "\n";
}

function formatToolResult(part) {
  const content = asText(part.content || part.result || part.output || part.state?.output || part);
  if (!content.trim()) return "";
  return "\n" + content.trimEnd() + "\n";
}

function buildClaudePartKey(part) {
  return JSON.stringify([
    part.id || part.tool_use_id || "",
    part.name || part.tool_name || part.tool || "",
    toolCommandFromInput(part.input || part.arguments || part.parameters || part.state?.input || part.payload),
    asText(part.content || part.result || part.output || part.state?.output),
  ]);
}

function formatClaudeToolUse(part) {
  const key = buildClaudePartKey(part);
  if (claudeToolUses.has(key)) return "";
  claudeToolUses.add(key);
  return formatToolUse(part);
}

function formatClaudeToolResult(part) {
  const key = buildClaudePartKey(part);
  if (claudeToolResults.has(key)) return "";
  claudeToolResults.add(key);
  return formatToolResult(part);
}

function formatClaudeContent(content) {
  if (!Array.isArray(content)) return "";

  return content
    .map((part) => {
      if (!part || typeof part !== "object") return "";
      if (part.type === "tool_use") return formatClaudeToolUse(part);
      if (part.type === "tool_result") return formatClaudeToolResult(part);
      return "";
    })
    .filter(Boolean)
    .join("");
}

function formatClaudeHook(event) {
  const hookName =
    event.hook_event_name ||
    event.subtype ||
    event.event?.hook_event_name ||
    event.hook?.name ||
    "hook";
  const payload = event.payload || event.data || event.hook || event.event || {};
  const command = toolCommandFromInput(
    payload.input || payload.arguments || payload.parameters || event.input || event.arguments || payload,
  );
  const output = asText(payload.output || payload.stdout || payload.stderr || payload.message || event.message);

  if (command) {
    return "\n▸ " + hookName + ": " + command + "\n" + (output ? output.trimEnd() + "\n" : "");
  }

  if (output.trim()) {
    return "\n[" + hookName + "] " + output.trimEnd() + "\n";
  }

  return "";
}

function formatClaude(event) {
  if (event.type === "system" || event.type === "result") return "";

  if (event.type === "stream_event") {
    const streamEvent = event.event;
    if (!streamEvent || typeof streamEvent !== "object") return "";

    if (
      streamEvent.type === "content_block_delta" &&
      streamEvent.delta?.type === "text_delta"
    ) {
      return streamEvent.delta.text || "";
    }

    if (
      streamEvent.type === "content_block_start" &&
      streamEvent.content_block?.type === "tool_use"
    ) {
      return formatClaudeToolUse(streamEvent.content_block);
    }

    if (
      streamEvent.type === "content_block_start" &&
      streamEvent.content_block?.type === "tool_result"
    ) {
      return formatClaudeToolResult(streamEvent.content_block);
    }

    return "";
  }

  if (event.type === "assistant") {
    return formatClaudeContent(event.message?.content || event.event?.message?.content);
  }

  if (
    event.type === "hook" ||
    event.type === "hook_event" ||
    event.type === "hook-event" ||
    event.hook_event_name
  ) {
    return formatClaudeHook(event);
  }

  if (event.type === "tool_use") return formatClaudeToolUse(event);
  if (event.type === "tool_result") return formatClaudeToolResult(event);

  const error = asText(event.error);
  if (error) return "\n[error] " + error + "\n";

  return "";
}

function formatLine(line) {
  try {
    return formatClaude(JSON.parse(line));
  } catch {
    return line + "\n";
  }
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on("line", (line) => {
  const formatted = formatLine(line);
  if (formatted) process.stdout.write(formatted);
});
`;

export function readTaskOutput(task: Task): string {
  try {
    return existsSync(task.outputFile)
      ? cleanTaskOutput(readFileSync(task.outputFile, "utf-8"))
      : "";
  } catch {
    return "";
  }
}

function cleanTaskOutput(output: string): string {
  return output
    .replace(/\u2029/g, "")
    .split("\n")
    .filter(
      (line) =>
        !/^\[(system|stream_event|assistant|result)\]$/.test(line.trim()),
    )
    .filter((line) => !/^\[tool\]\s+\S+\s*$/.test(line.trim()))
    .filter((line) => !/^▸\s+\S+\s*$/.test(line.trim()))
    .filter((line) => line.trim() !== "(Bash completed with no output)")
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimStart();
}

function readTaskPid(task: Task): number | null {
  try {
    const pid = readFileSync(task.pidFile, "utf-8").trim();
    const parsed = Number(pid);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function readTaskExitCode(task: Task): number | null {
  try {
    if (!task.exitCodeFile || !existsSync(task.exitCodeFile)) return null;
    const raw = readFileSync(task.exitCodeFile, "utf-8").trim();
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isInteger(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function isTaskRunning(task: Task): boolean {
  try {
    const pid = readTaskPid(task);
    if (!pid) return false;
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function getTaskStatus(task: Task): Task["status"] {
  if (task.status === "canceled") return "stopped";
  if (task.status !== "running") return task.status;

  const exitCode = readTaskExitCode(task);
  if (exitCode === 0) return "completed";
  if (exitCode !== null) {
    return exitCode === 130 || exitCode === 143 ? "stopped" : "failed";
  }

  if (isTaskRunning(task)) return "running";

  const output = readTaskOutput(task).toLowerCase();
  if (output.includes("task canceled by user")) return "stopped";
  return "completed";
}

function signalTaskProcess(task: Task, signal: NodeJS.Signals): boolean {
  const pid = readTaskPid(task);
  if (!pid) return false;

  let signaled = false;
  try {
    process.kill(-pid, signal);
    signaled = true;
  } catch {
    // Older tasks may not have been launched as their own process group.
  }

  try {
    process.kill(pid, signal);
    signaled = true;
  } catch {
    // The process may already have exited after signaling the process group.
  }

  return signaled;
}

export async function stopTask(task: Task): Promise<void> {
  signalTaskProcess(task, "SIGTERM");
  await new Promise((resolve) => setTimeout(resolve, 1200));

  if (isTaskRunning(task)) {
    signalTaskProcess(task, "SIGKILL");
  }

  try {
    appendFileSync(task.outputFile, "\n\n[Task canceled by user]\n");
  } catch {
    // Ignore log write failures; the stored status is authoritative.
  }

  if (task.exitCodeFile) {
    try {
      writeFileSync(task.exitCodeFile, "130\n");
    } catch {
      // Best effort for tasks created before exit-code tracking.
    }
  }

  try {
    writeFileSync(task.pidFile, "");
  } catch {
    // Best effort cleanup.
  }

  await updateTask(task.id, { status: "stopped" });
}

export async function launchTask(
  command: TaskCommand,
  dir: string,
  label: string,
  options: TaskOptions = {},
): Promise<Task | null> {
  ensureTaskDir();
  reapStaleTaskProcesses();
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const outputFile = join(TASK_DIR, `${id}.log`);
  const pidFile = join(TASK_DIR, `${id}.pid`);
  const exitCodeFile = join(TASK_DIR, `${id}.exit`);

  writeFileSync(outputFile, "");
  writeFileSync(pidFile, "");
  writeFileSync(exitCodeFile, "");

  const branch = getCurrentBranch(dir);
  const task: Task = {
    id,
    command,
    dir,
    label,
    branch,
    targetBranch: options.targetBranch,
    prUrl: options.prUrl,
    status: "running",
    outputFile,
    pidFile,
    exitCodeFile,
    startTime: Date.now(),
  };
  await addTask(task);

  let claudeCommand: string | null;
  try {
    const model = await getModel();
    claudeCommand = buildClaudeCommand(command, options, model);
  } catch (error) {
    await removeTask(id);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to start task",
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }

  if (!claudeCommand) {
    await removeTask(id);
    await showToast({
      style: Toast.Style.Failure,
      title: "No skill file configured",
      message: "Please configure a skill file via Manage Folders & Skills",
    });
    return null;
  }
  const home = homedir();

  const script = `
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
REPO_NAME=$(basename "$PWD")
TASK_LABEL=${JSON.stringify(label)}
TASK_COMMAND=${JSON.stringify(command)}
OUTPUT_FILE=${JSON.stringify(outputFile)}
PID_FILE=${JSON.stringify(pidFile)}

trap 'printf "\\n[Task canceled by user]\\n" >> ${JSON.stringify(outputFile)}; printf "130\\n" > ${JSON.stringify(exitCodeFile)}; exit 130' TERM INT

cleanup_residual_processes() {
  local roots descendants
  roots="$$"
  descendants=""

  while [ -n "$roots" ]; do
    local children
    children=$(ps -axo pid=,ppid= 2>/dev/null | awk -v roots=" $roots " '
      index(roots, " " $2 " ") { print $1 }
    ')
    if [ -z "$children" ]; then
      break
    fi

    descendants="$descendants $children"
    roots=$(echo "$children" | tr '\n' ' ' | xargs)
  done

  descendants=$(echo "$descendants" | xargs)
  if [ -z "$descendants" ]; then
    return 0
  fi

  kill -TERM $descendants 2>/dev/null || true
  sleep 0.3

  roots="$$"
  descendants=""
  while [ -n "$roots" ]; do
    local children
    children=$(ps -axo pid=,ppid= 2>/dev/null | awk -v roots=" $roots " '
      index(roots, " " $2 " ") { print $1 }
    ')
    if [ -z "$children" ]; then
      break
    fi

    descendants="$descendants $children"
    roots=$(echo "$children" | tr '\n' ' ' | xargs)
  done

  descendants=$(echo "$descendants" | xargs)
  if [ -n "$descendants" ]; then
    kill -KILL $descendants 2>/dev/null || true
  fi
}

${claudeCommand} 2>&1 | node ${JSON.stringify(FORMATTER_FILE)} | tee -a ${JSON.stringify(outputFile)}
EXIT_CODE=\${PIPESTATUS[0]}
printf "%s\\n" "$EXIT_CODE" > ${JSON.stringify(exitCodeFile)}
cleanup_residual_processes

if [ $EXIT_CODE -eq 0 ]; then
  OPEN_URL=""
  if [ "$TASK_COMMAND" = "create-pr" ]; then
    OPEN_URL=$(grep -oE 'https://github\\.com/[^/]+/[^/]+/pull/[0-9]+' "$OUTPUT_FILE" | head -1)
    if [ -z "$OPEN_URL" ]; then
      OPEN_URL=$(grep -oE 'https://gitlab\\.com/[^[:space:]<>")}]*/-/(merge_requests)/[0-9]+' "$OUTPUT_FILE" | head -1)
    fi
    if [ -z "$OPEN_URL" ]; then
      OPEN_URL=$(grep -oE 'https://bitbucket\\.org/[^[:space:]<>")}]*/pull-requests/[0-9]+' "$OUTPUT_FILE" | head -1)
    fi
  elif [ "$TASK_COMMAND" = "review-pr" ]; then
    OPEN_URL=$(grep -oE 'https://github\\.com/[^/]+/[^/]+/pull/[0-9]+' "$OUTPUT_FILE" | head -1)
    if [ -z "$OPEN_URL" ]; then
      OPEN_URL=$(grep -oE 'https://gitlab\\.com/[^[:space:]<>")}]*/-/(merge_requests)/[0-9]+' "$OUTPUT_FILE" | head -1)
    fi
    if [ -z "$OPEN_URL" ]; then
      OPEN_URL=$(grep -oE 'https://bitbucket\\.org/[^[:space:]<>")}]*/pull-requests/[0-9]+' "$OUTPUT_FILE" | head -1)
    fi
  elif [ "$TASK_COMMAND" = "git-push" ]; then
    OPEN_URL=$(grep -oE 'https://(github\\.com|gitlab\\.com)/[^[:space:]<>")}]+/commit/[0-9a-f]+' "$OUTPUT_FILE" | head -1)
    if [ -z "$OPEN_URL" ]; then
      OPEN_URL=$(grep -oE 'https://bitbucket\\.org/[^[:space:]<>")}]+/commits/[0-9a-f]+' "$OUTPUT_FILE" | head -1)
    fi
    if [ -z "$OPEN_URL" ]; then
      OPEN_URL=$(grep -oE 'https://(github\\.com|gitlab\\.com|bitbucket\\.org)/[^[:space:]<>")}]+' "$OUTPUT_FILE" | head -1 | sed "s/[.,;:)']*$//")
    fi
    if [ -z "$OPEN_URL" ]; then
      SSH_MATCH=$(grep -oE '(git@)?(github\\.com|gitlab\\.com|bitbucket\\.org):[^[:space:]]+' "$OUTPUT_FILE" | tail -1)
      if [ -n "$SSH_MATCH" ]; then
        SSH_HOST=$(echo "$SSH_MATCH" | sed 's/^git@//' | cut -d: -f1)
        SSH_PATH=$(echo "$SSH_MATCH" | cut -d: -f2 | sed 's/\\.git$//')
        OPEN_URL="https://$SSH_HOST/$SSH_PATH"
      fi
    fi
  fi

  # Replace base URL in OPEN_URL with actual git remote base URL
  if [ -n "$OPEN_URL" ]; then
    REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
    if [ -n "$REMOTE_URL" ]; then
      REMOTE_BASE=""
      case "$REMOTE_URL" in
        https://*)
          REMOTE_BASE=$(echo "$REMOTE_URL" | sed 's/\\.git$//' | grep -oE '^https://[^/]+/[^/]+/[^/]+')
          ;;
        git@*)
          REMOTE_HOST=$(echo "$REMOTE_URL" | sed 's/^git@//' | cut -d: -f1)
          REMOTE_PATH=$(echo "$REMOTE_URL" | cut -d: -f2 | sed 's/\\.git$//')
          REMOTE_BASE="https://$REMOTE_HOST/$REMOTE_PATH"
          ;;
      esac
      if [ -n "$REMOTE_BASE" ]; then
        URL_BASE=$(echo "$OPEN_URL" | grep -oE '^https://[^/]+/[^/]+/[^/]+')
        if [ -n "$URL_BASE" ] && [ "$URL_BASE" != "$REMOTE_BASE" ]; then
          OPEN_URL=$(echo "$OPEN_URL" | sed "s|$URL_BASE|$REMOTE_BASE|")
        fi
      fi
    fi
  fi

  if [ -n "$OPEN_URL" ]; then
    terminal-notifier -title "$CURRENT_BRANCH" -subtitle "$REPO_NAME" -message "$TASK_LABEL done" -open "$OPEN_URL" -sound Glass 2>/dev/null || true
  else
    terminal-notifier -title "$CURRENT_BRANCH" -subtitle "$REPO_NAME" -message "$TASK_LABEL done" -sound Glass 2>/dev/null || true
  fi
else
  terminal-notifier -title "$CURRENT_BRANCH" -subtitle "$REPO_NAME" -message "$TASK_LABEL failed" -sound Basso 2>/dev/null || true
fi

printf "" > "$PID_FILE"

exit $EXIT_CODE
`.trim();

  const markLaunchFailed = async (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    appendFileSync(outputFile, `[failed to start task] ${message}\n`);
    writeFileSync(exitCodeFile, "1\n");
    await updateTask(task.id, { status: "failed" });
  };

  let child: ChildProcess;
  try {
    child = spawn("/bin/bash", ["-lc", script], {
      cwd: dir,
      detached: true,
      stdio: "ignore",
      env: {
        ...process.env,
        PATH: `${home}/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH || ""}`,
      },
    });
  } catch (error) {
    await markLaunchFailed(error);
    throw error;
  }

  child.on("error", (error) => {
    void markLaunchFailed(error);
  });

  child.unref();

  if (child.pid) {
    writeFileSync(pidFile, String(child.pid));
  } else {
    writeFileSync(exitCodeFile, "1\n");
    await updateTask(task.id, { status: "failed" });
  }

  return task;
}
