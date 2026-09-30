import { getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { spawn } from "node:child_process";
import { statSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

export type FxSession = {
  id: string;
  title: string | null;
  preview: string | null;
  workspace_root: string;
  origin_workspace_root: string;
  created_at_ms: number;
  updated_at_ms: number;
  history_len: number;
  conversation_language: string | null;
};

export type FxSessionsResponse = {
  kind: "sessions";
  count: number;
  sessions: FxSession[];
  has_more?: boolean;
  next_cursor?: string;
};

export type FxSessionImage = {
  path?: string;
  media_type?: string;
};

export type FxSessionUser = {
  text?: string;
  images?: FxSessionImage[];
};

export type FxToolCall = {
  id?: string;
  name?: string;
  arguments_json?: string;
};

export type FxToolResult = {
  tool_call_id?: string;
  tool_name?: string;
  status?: string;
  output?: string;
};

export type FxExecution = {
  schema_version?: number;
  tool_steps?: Array<{
    assistant?: string | null;
    tool_calls?: FxToolCall[];
    tool_results?: FxToolResult[];
  }>;
  files?: unknown[];
};

export type FxHistoryTurn = {
  kind: string;
  user?: FxSessionUser | string;
  assistant?: string | null;
  execution?: FxExecution;
  summary?: string;
  removed_turn_count?: number;
  compaction_count?: number;
  log_path?: string;
  url?: string;
  completed_tool_names?: string[];
  tool_call?: FxToolCall | null;
};

export type FxSessionDetail = {
  kind: "session_detail";
  id: string;
  created_at_ms: number;
  updated_at_ms: number;
  history_len: number;
  conversation_language: string | null;
  history: FxHistoryTurn[];
};

export type FxStatusResponse = {
  kind: "status";
  model?: string;
  model_source?: string;
  update_channel?: string;
  build_channel?: string;
  build_revision?: string;
  auth?: string;
  connected_providers?: string[];
  auth_refreshable?: boolean;
  permission_mode?: string;
  workspace?: string;
  history_turns?: number;
  session_permission_grants?: number;
  agent_step_limit?: number;
};

export type FxDoctorCheck = {
  name: string;
  status: "ok" | "warn" | "fail" | string;
  detail?: string;
};

export type FxDoctorResponse = {
  kind: "doctor";
  ok_count?: number;
  warn_count?: number;
  fail_count?: number;
  workspace?: string;
  model?: string;
  model_source?: string;
  auth?: string;
  auth_refreshable?: boolean;
  permission_mode?: string;
  agent_step_limit?: number;
  checks?: FxDoctorCheck[];
};

export type FxUsageTotals = {
  total_tokens?: number;
  input_tokens?: number;
  output_tokens?: number;
  cache_read_tokens?: number;
  cache_write_tokens?: number;
  reasoning_tokens?: number | null;
  request_count?: number;
  spend?: number;
};

export type FxUsageResponse = {
  kind: "usage";
  schema_version?: number;
  period?: string;
  snapshot_time_ms?: number;
  window_start_ms?: number;
  coverage?: {
    status?: string;
    started_at_ms?: number;
    full_window?: boolean;
  };
  completeness?: string;
  totals?: FxUsageTotals;
  models?: Array<{ model?: string; totals?: FxUsageTotals }>;
};

export type FxAskResponse = {
  output?: string;
  error?: string;
  exit_code: number;
  model?: string;
  session_id?: string;
  steps?: number;
  usage?: {
    requests?: number;
    input_tokens?: number;
    output_tokens?: number;
  };
  tool_calls?: Array<{ name: string; status: string; [key: string]: unknown }>;
};

type RunOptions = {
  cwd?: string;
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 20_000;
export const FX_INSTALL_COMMAND = "curl -fsSL https://fx.sh/setup.sh | bash";
export const FX_INSTALLATION_URL = "https://fx.sh/docs/getting-started/installation";

export class FxCommandError extends Error {
  constructor(
    message: string,
    readonly kind: "not-installed" | "failed" | "timeout",
    readonly stdout = "",
  ) {
    super(message);
    this.name = "FxCommandError";
  }
}

export function getFxPreferences(): Preferences {
  const preferences = getPreferenceValues<Preferences>();
  return {
    fxPath: resolveExecutable(preferences.fxPath),
    defaultWorkspace: preferences.defaultWorkspace,
  };
}

export function resolveExecutable(value?: string): string {
  const executable = value?.trim() || "fx";
  if (executable === "~") return homedir();
  if (executable.startsWith(`~${path.sep}`)) return path.join(homedir(), executable.slice(2));
  return executable;
}

export function defaultWorkingDirectory(workspace?: string): string {
  return workspace?.trim() || homedir();
}

function commandEnvironment(): NodeJS.ProcessEnv {
  const pathKey = Object.keys(process.env).find((key) => key.toLowerCase() === "path") || "PATH";
  const currentPath = process.env[pathKey] || "";
  const extraPaths = [path.join(homedir(), ".local", "bin"), "/opt/homebrew/bin", "/usr/local/bin"];
  return {
    ...process.env,
    [pathKey]: [...extraPaths, currentPath].filter(Boolean).join(path.delimiter),
  };
}

export function runFx(executable: string, args: string[], options: RunOptions = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const cwd = defaultWorkingDirectory(options.cwd);
    try {
      if (!statSync(cwd).isDirectory()) throw new Error("not a directory");
    } catch {
      reject(new FxCommandError(`The workspace does not exist or is not a directory: ${cwd}`, "failed"));
      return;
    }
    const child = spawn(executable, args, {
      cwd,
      env: commandEnvironment(),
      shell: false,
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      child.kill();
      if (!settled) {
        settled = true;
        reject(new FxCommandError("fx did not respond before the command timed out.", "timeout", stdout));
      }
    }, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => (stdout += chunk));
    child.stderr.on("data", (chunk: string) => (stderr += chunk));
    child.on("error", (error) => {
      clearTimeout(timer);
      if (settled) return;
      settled = true;
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        reject(
          new FxCommandError(
            `fx is not installed or Raycast cannot find it. Install it with \`${FX_INSTALL_COMMAND}\`, or set the full executable path in Extension Preferences.`,
            "not-installed",
          ),
        );
        return;
      }
      reject(new FxCommandError(`Could not run fx: ${error.message}`, "failed", stdout));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (settled) return;
      settled = true;
      if (code === 0) resolve(stdout);
      else reject(new FxCommandError(stderr.trim() || `fx exited with status ${code ?? "unknown"}.`, "failed", stdout));
    });
  });
}

export async function runFxJson<T>(executable: string, args: string[], options: RunOptions = {}): Promise<T> {
  let output: string;
  try {
    output = await runFx(executable, args, options);
  } catch (error) {
    if (!(error instanceof FxCommandError) || !error.stdout.trim()) throw error;
    output = error.stdout;
  }

  try {
    return JSON.parse(output) as T;
  } catch {
    throw new FxCommandError("fx returned invalid JSON. Upgrade fx and try again.", "failed", output);
  }
}

function isSession(value: unknown): value is FxSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<FxSession>;
  return (
    typeof session.id === "string" &&
    typeof session.workspace_root === "string" &&
    typeof session.created_at_ms === "number" &&
    typeof session.updated_at_ms === "number" &&
    typeof session.history_len === "number"
  );
}

export function parseSessions(value: unknown): FxSessionsResponse {
  if (!value || typeof value !== "object")
    throw new FxCommandError("fx returned an unexpected sessions response.", "failed");
  const response = value as Partial<FxSessionsResponse>;
  if (response.kind !== "sessions" || !Array.isArray(response.sessions) || !response.sessions.every(isSession)) {
    throw new FxCommandError("fx returned an unsupported sessions response. Upgrade fx and try again.", "failed");
  }
  return response as FxSessionsResponse;
}

export function parseSessionDetail(value: unknown): FxSessionDetail {
  if (!value || typeof value !== "object")
    throw new FxCommandError("fx returned an unexpected session response.", "failed");
  const response = value as Partial<FxSessionDetail>;
  if (
    response.kind !== "session_detail" ||
    typeof response.id !== "string" ||
    typeof response.history_len !== "number" ||
    !Array.isArray(response.history)
  ) {
    throw new FxCommandError("fx returned an unsupported session response. Upgrade fx and try again.", "failed");
  }
  return response as FxSessionDetail;
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}

export async function launchInTerminal(executable: string, args: string[], cwd: string): Promise<void> {
  await runFx(executable, ["--version"], { cwd, timeoutMs: 5_000 });
  const command = `cd -- ${shellQuote(cwd)} && ${shellQuote(executable)} ${args.map(shellQuote).join(" ")}`;
  await launchShellCommandInTerminal(command);
}

export async function launchShellCommandInTerminal(command: string): Promise<void> {
  await runAppleScript(
    `
    on run argv
      tell application "Terminal"
        activate
        do script (item 1 of argv)
      end tell
    end run
    `,
    [command],
  );
}

export function isFxNotInstalled(error: unknown): boolean {
  return error instanceof FxCommandError && error.kind === "not-installed";
}

export function workspaceName(workspace: string): string {
  const parts = workspace.replace(/[\\/]+$/, "").split(/[\\/]/);
  return parts.at(-1) || workspace;
}

export function markdownEscape(value: string): string {
  const specialCharacters = new Set("\\`*_{}[]()<>#+-.!|>");
  return Array.from(value, (character) => (specialCharacters.has(character) ? `\\${character}` : character)).join("");
}
