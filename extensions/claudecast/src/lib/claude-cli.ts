import { execFile, spawn } from "child_process";
import { promisify } from "util";
import { getPreferenceValues } from "@raycast/api";
import path from "path";
import fs from "fs";
import os from "os";
import { StringDecoder } from "string_decoder";
import { expandHomePath, isWindows } from "./platform";
import {
  findWindowsExecutable,
  getWindowsEnvironment,
  getWindowsPath,
} from "./windows-runtime";
import {
  getClaudeSpawnSpec,
  resolveWindowsClaudeShim,
} from "./claude-process-core";

const execFilePromise = promisify(execFile);

function terminateClaudeChild(child: ReturnType<typeof spawn>): Promise<void> {
  if (isWindows() && child.pid) {
    return new Promise((resolve, reject) => {
      execFile(
        path.win32.join(
          process.env.SystemRoot || "C:\\Windows",
          "System32",
          "taskkill.exe",
        ),
        ["/PID", String(child.pid), "/T", "/F"],
        { windowsHide: true, timeout: 5000 },
        (error) =>
          error && child.exitCode === null ? reject(error) : resolve(),
      );
    });
  }
  child.kill();
  return Promise.resolve();
}

/** Build the child environment used by every non-interactive Claude command. */
export async function getClaudeEnvironment(
  options: { includePreferenceAuth?: boolean } = {},
): Promise<NodeJS.ProcessEnv> {
  const preferences = getPreferenceValues<Preferences>();
  const env = isWindows()
    ? await getWindowsEnvironment()
    : {
        ...process.env,
        PATH: [process.env.PATH, "/usr/local/bin", "/opt/homebrew/bin"]
          .filter(Boolean)
          .join(path.delimiter),
        HOME: os.homedir(),
      };

  if (options.includePreferenceAuth !== false) {
    if (preferences.anthropicApiKey) {
      env.ANTHROPIC_API_KEY = preferences.anthropicApiKey;
    }
    if (preferences.oauthToken) {
      env.CLAUDE_CODE_OAUTH_TOKEN = preferences.oauthToken;
    }
  }
  if (preferences.claudeConfigPath) {
    env.CLAUDE_CONFIG_DIR = expandHomePath(preferences.claudeConfigPath);
  }
  return env;
}

export interface ClaudeResponse {
  result: string;
  session_id?: string;
  total_cost_usd?: number;
  is_error?: boolean;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface ClaudeStreamChunk {
  type: string;
  content?: string;
  session_id?: string;
  total_cost_usd?: number;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

function usableClaudePath(candidate: string): string | null {
  if (!isWindows()) return candidate;
  const extension = path.win32.extname(candidate).toLowerCase();
  return [".cmd", ".bat"].includes(extension)
    ? resolveWindowsClaudeShim(candidate)
    : candidate;
}

/**
 * Find the Claude CLI binary path
 */
export async function getClaudePath(): Promise<string | null> {
  const preferences = getPreferenceValues<Preferences>();

  // Check user preference first
  if (preferences.claudeCodePath) {
    const configuredPath = expandHomePath(preferences.claudeCodePath);
    try {
      await fs.promises.access(
        configuredPath,
        isWindows() ? fs.constants.F_OK : fs.constants.X_OK,
      );
      const usable = usableClaudePath(configuredPath);
      if (usable) return usable;
    } catch {
      // Fall through to auto-detection
    }
  }

  // Common installation paths - check these first (more reliable than `which` in sandboxed environments)
  const home = os.homedir();
  const commonPaths = isWindows()
    ? [
        path.win32.join(home, ".local", "bin", "claude.exe"),
        process.env.APPDATA
          ? path.win32.join(process.env.APPDATA, "npm", "claude.cmd")
          : "",
        process.env.LOCALAPPDATA
          ? path.win32.join(
              process.env.LOCALAPPDATA,
              "Microsoft",
              "WinGet",
              "Links",
              "claude.exe",
            )
          : "",
      ].filter(Boolean)
    : [
        "/opt/homebrew/bin/claude",
        "/usr/local/bin/claude",
        path.join(home, ".npm-global/bin/claude"),
        path.join(home, ".local/bin/claude"),
      ];

  // Try common paths first
  for (const p of commonPaths) {
    try {
      await fs.promises.access(
        p,
        isWindows() ? fs.constants.F_OK : fs.constants.X_OK,
      );
      const usable = usableClaudePath(p);
      if (usable) return usable;
    } catch {
      continue;
    }
  }

  if (isWindows()) {
    const pathValue = await getWindowsPath();
    const resolved = findWindowsExecutable(
      ["claude.exe", "claude.cmd", "claude.bat"],
      pathValue,
    );
    if (resolved) {
      const usable = usableClaudePath(resolved);
      if (usable) return usable;
    }
    try {
      const whereExecutable = path.win32.join(
        process.env.SystemRoot || "C:\\Windows",
        "System32",
        "where.exe",
      );
      const { stdout } = await execFilePromise(whereExecutable, ["claude"], {
        env: await getWindowsEnvironment(),
        windowsHide: true,
      });
      for (const candidate of stdout.split(/\r?\n/).filter(Boolean)) {
        const usable = usableClaudePath(candidate.trim());
        if (usable) return usable;
      }
    } catch {
      // where.exe failed
    }
  } else {
    try {
      const { stdout } = await execFilePromise("which", ["claude"]);
      const claudePath = stdout.trim();
      if (claudePath) return claudePath;
    } catch {
      // which failed
    }
  }

  return null;
}

/**
 * Execute a prompt using Claude CLI.
 *
 * The default 10-minute timeout covers most reviews of large diffs / contexts.
 * Callers with shorter or longer expectations can pass `timeoutMs` explicitly.
 */
export async function executePrompt(
  prompt: string,
  options: {
    model?: string;
    context?: string;
    cwd?: string;
    sessionId?: string;
    timeoutMs?: number;
  } = {},
): Promise<ClaudeResponse> {
  const claudePath = await getClaudePath();
  if (!claudePath) {
    throw new Error(
      "Claude CLI not found. Please install Claude Code: npm install -g @anthropic-ai/claude-code",
    );
  }

  const preferences = getPreferenceValues<Preferences>();
  const model = options.model || preferences.defaultModel || "sonnet";
  const timeoutMs = options.timeoutMs ?? 10 * 60 * 1000;

  // Build the full prompt with context
  let fullPrompt = prompt;
  if (options.context) {
    fullPrompt = `Context:\n${options.context}\n\nQuestion/Task:\n${prompt}`;
  }

  // Build command args
  // Use stream-json with verbose to capture all assistant messages
  // Plain json format returns empty result for agentic/tool-using prompts
  const args: string[] = [
    "-p",
    "--output-format",
    "stream-json",
    "--verbose",
    "--model",
    model,
  ];

  if (options.sessionId) {
    args.push("-r", options.sessionId);
  }

  const env = await getClaudeEnvironment();

  return new Promise((resolve, reject) => {
    const spec = getClaudeSpawnSpec(claudePath, args);
    const child = spawn(spec.command, spec.args, {
      cwd: options.cwd || os.homedir(),
      env,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    child.stdin.on("error", () => undefined);
    child.stdin.end(fullPrompt);

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      const minutes = Math.round(timeoutMs / 60000);
      terminateClaudeChild(child)
        .then(() =>
          reject(new Error(`Claude CLI timed out after ${minutes} minutes`)),
        )
        .catch((error) =>
          reject(
            new Error(
              `Claude CLI timed out and its process could not be stopped: ${error instanceof Error ? error.message : String(error)}`,
            ),
          ),
        );
    }, timeoutMs);

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      clearTimeout(timeout);
      if (timedOut) return;
      if (code !== 0 && !stdout) {
        reject(new Error(stderr || `Claude CLI exited with code ${code}`));
        return;
      }

      try {
        // Parse the JSON output - may have multiple JSON lines (streaming format)
        const lines = stdout.trim().split("\n").filter(Boolean);
        let accumulatedContent = ""; // Content from assistant messages
        let resultFieldContent = ""; // Content from result.result field
        let sessionId: string | undefined;
        let totalCost: number | undefined;
        let usage: { input_tokens: number; output_tokens: number } | undefined;
        let parsedAnyJson = false;

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            parsedAnyJson = true;

            if (parsed.type === "result") {
              // Get metadata from result line
              sessionId = parsed.session_id;
              totalCost = parsed.total_cost_usd;
              usage = parsed.usage;
              // Only use result field if it has content
              if (parsed.result) {
                resultFieldContent = parsed.result;
              }
            } else if (parsed.type === "assistant" && parsed.message?.content) {
              // Handle assistant message content blocks
              for (const block of parsed.message.content) {
                if (block.type === "text") {
                  accumulatedContent += block.text;
                }
              }
            } else if (parsed.result) {
              // Direct result format (non-type response)
              resultFieldContent = parsed.result;
              sessionId = parsed.session_id;
              totalCost = parsed.total_cost_usd;
              usage = parsed.usage;
            }
          } catch {
            // Not valid JSON, might be plain text
            accumulatedContent += line;
          }
        }

        // Prefer accumulated content from assistant messages,
        // fall back to result field
        let finalResult = accumulatedContent || resultFieldContent;

        // If we parsed JSON but have no content, and there was meaningful output,
        // this indicates the CLI returned data in an unexpected format
        if (
          !finalResult &&
          parsedAnyJson &&
          usage?.output_tokens &&
          usage.output_tokens > 0
        ) {
          // The CLI generated output but we couldn't extract it - return the raw JSON
          // so the user at least sees something (better than empty)
          finalResult = stdout;
        } else if (!finalResult && !parsedAnyJson) {
          // Couldn't parse any JSON, return raw stdout
          finalResult = stdout;
        }

        resolve({
          result: finalResult || "",
          session_id: sessionId,
          total_cost_usd: totalCost,
          usage,
        });
      } catch (e) {
        // If JSON parsing fails completely, return raw output
        resolve({
          result: stdout || stderr,
          is_error: !!stderr && !stdout,
        });
      }
    });

    child.on("error", (err) => {
      clearTimeout(timeout);
      if (timedOut) return;
      reject(err);
    });
  });
}

/**
 * Execute a prompt and stream the response
 */
export async function executePromptStreaming(
  prompt: string,
  options: {
    model?: string;
    context?: string;
    cwd?: string;
    onChunk?: (chunk: string) => void;
  } = {},
): Promise<ClaudeResponse> {
  const claudePath = await getClaudePath();
  if (!claudePath) {
    throw new Error(
      "Claude CLI not found. Please install Claude Code: npm install -g @anthropic-ai/claude-code",
    );
  }

  const preferences = getPreferenceValues<Preferences>();
  const model = options.model || preferences.defaultModel || "sonnet";

  let fullPrompt = prompt;
  if (options.context) {
    fullPrompt = `Context:\n${options.context}\n\nQuestion/Task:\n${prompt}`;
  }

  const args: string[] = [
    "-p",
    "--output-format",
    "stream-json",
    "--model",
    model,
  ];

  const env = await getClaudeEnvironment();

  return new Promise((resolve, reject) => {
    const spec = getClaudeSpawnSpec(claudePath, args);
    const child = spawn(spec.command, spec.args, {
      cwd: options.cwd || os.homedir(),
      env,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    child.stdin.on("error", () => undefined);
    child.stdin.end(fullPrompt);

    let fullResult = "";
    let sessionId: string | undefined;
    let totalCost: number | undefined;
    let usage: { input_tokens: number; output_tokens: number } | undefined;

    child.stdout.on("data", (data) => {
      const text = data.toString();
      const lines = text.split("\n").filter(Boolean);

      for (const line of lines) {
        try {
          const parsed: ClaudeStreamChunk = JSON.parse(line);

          if (
            parsed.type === "assistant" ||
            parsed.type === "content_block_delta"
          ) {
            const content = parsed.content || "";
            fullResult += content;
            options.onChunk?.(content);
          } else if (parsed.type === "result") {
            sessionId = parsed.session_id;
            totalCost = parsed.total_cost_usd;
            usage = parsed.usage;
          }
        } catch {
          // Plain text chunk
          fullResult += line;
          options.onChunk?.(line);
        }
      }
    });

    child.stderr.on("data", () => {
      // Ignore stderr for streaming
    });

    child.on("close", () => {
      resolve({
        result: fullResult,
        session_id: sessionId,
        total_cost_usd: totalCost,
        usage,
      });
    });

    child.on("error", reject);
  });
}

/**
 * Check if Claude CLI is installed
 */
export async function isClaudeInstalled(): Promise<boolean> {
  const path = await getClaudePath();
  return path !== null;
}

/**
 * Ensure Claude CLI is installed, showing a toast if not
 * Returns true if installed, false otherwise
 */
export async function ensureClaudeInstalled(): Promise<boolean> {
  const installed = await isClaudeInstalled();
  if (!installed) {
    const { showToast, Toast } = await import("@raycast/api");
    await showToast({
      style: Toast.Style.Failure,
      title: "Claude Code not installed",
      message: isWindows()
        ? "Install: winget install Anthropic.ClaudeCode"
        : "Install: curl -fsSL https://claude.ai/install.sh | bash",
    });
  }
  return installed;
}

// Accepts Raycast prefs, ANTHROPIC_API_KEY/CLAUDE_CODE_OAUTH_TOKEN env vars,
// or `claude auth status --json` reporting loggedIn (covers `claude auth login`).
export async function isAuthConfigured(): Promise<boolean> {
  const { getPreferenceValues } = await import("@raycast/api");
  const preferences = getPreferenceValues<Preferences>();
  if (preferences.anthropicApiKey || preferences.oauthToken) return true;
  if (
    process.env.ANTHROPIC_API_KEY ||
    process.env.ANTHROPIC_AUTH_TOKEN ||
    process.env.CLAUDE_CODE_OAUTH_TOKEN
  )
    return true;

  const claudePath = await getClaudePath();
  if (!claudePath) return false;
  try {
    const spec = getClaudeSpawnSpec(claudePath, ["auth", "status", "--json"]);
    const { stdout } = await execFilePromise(spec.command, spec.args, {
      timeout: 3000,
      env: await getClaudeEnvironment(),
      windowsHide: true,
    });
    const parsed = JSON.parse(stdout);
    return parsed?.loggedIn === true;
  } catch {
    return false;
  }
}

// Bail early when no auth is available; otherwise the spawned claude would
// stall on its own /login prompt inside the non-interactive child process.
export async function ensureClaudeApiAuth(): Promise<boolean> {
  if (await isAuthConfigured()) return true;
  const { showToast, Toast, openCommandPreferences } =
    await import("@raycast/api");
  await showToast({
    style: Toast.Style.Failure,
    title: "Claude authentication missing",
    message:
      "Run 'claude setup-token' or 'claude auth login', set ANTHROPIC_API_KEY/ANTHROPIC_AUTH_TOKEN/CLAUDE_CODE_OAUTH_TOKEN, or add credentials in Raycast preferences",
    primaryAction: {
      title: "Open Preferences",
      onAction: () => openCommandPreferences(),
    },
  });
  return false;
}

/**
 * Get Claude CLI version
 */
export async function getClaudeVersion(): Promise<string | null> {
  const claudePath = await getClaudePath();
  if (!claudePath) return null;

  try {
    const spec = getClaudeSpawnSpec(claudePath, ["--version"]);
    const { stdout } = await execFilePromise(spec.command, spec.args, {
      env: await getClaudeEnvironment(),
      timeout: 3000,
      windowsHide: true,
    });
    return stdout.trim();
  } catch {
    return null;
  }
}

export async function startClaudeDaemon(): Promise<void> {
  const claudePath = await getClaudePath();
  if (!claudePath) throw new Error("Claude Code is not installed");
  const spec = getClaudeSpawnSpec(claudePath, ["daemon", "run"]);
  const env = await getClaudeEnvironment({ includePreferenceAuth: false });
  await new Promise<void>((resolve, reject) => {
    const child = spawn(spec.command, spec.args, {
      detached: true,
      stdio: "ignore",
      env,
      windowsHide: true,
    });
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
    child.once("error", reject);
  });
}

export async function runClaudeCommand(
  args: string[],
  options: {
    cwd?: string;
    timeoutMs?: number;
    maxBuffer?: number;
    includePreferenceAuth?: boolean;
  } = {},
): Promise<{ stdout: string; stderr: string }> {
  const claudePath = await getClaudePath();
  if (!claudePath) throw new Error("Claude Code is not installed");
  const spec = getClaudeSpawnSpec(claudePath, args);
  const env = await getClaudeEnvironment({
    includePreferenceAuth: options.includePreferenceAuth,
  });
  const timeoutMs = options.timeoutMs ?? 10_000;
  const maxBuffer = options.maxBuffer ?? 2 * 1024 * 1024;

  return new Promise((resolve, reject) => {
    const child = spawn(spec.command, spec.args, {
      cwd: options.cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    let outputBytes = 0;
    let settled = false;
    const stdoutDecoder = new StringDecoder("utf8");
    const stderrDecoder = new StringDecoder("utf8");

    const finishWithError = (error: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      terminateClaudeChild(child)
        .then(() => reject(error))
        .catch((terminationError) =>
          reject(
            new Error(
              `${error.message}; process cleanup failed: ${terminationError instanceof Error ? terminationError.message : String(terminationError)}`,
            ),
          ),
        );
    };
    const appendOutput = (target: "stdout" | "stderr", data: Buffer) => {
      outputBytes += data.byteLength;
      if (target === "stdout") stdout += stdoutDecoder.write(data);
      else stderr += stderrDecoder.write(data);
      if (outputBytes > maxBuffer) {
        finishWithError(new Error("Claude command output exceeded the limit"));
      }
    };

    child.stdout.on("data", (data) => {
      appendOutput("stdout", data);
    });
    child.stderr.on("data", (data) => {
      appendOutput("stderr", data);
    });

    const timeout = setTimeout(() => {
      finishWithError(new Error("Claude command timed out"));
    }, timeoutMs);

    child.once("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(error);
    });
    child.once("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      stdout += stdoutDecoder.end();
      stderr += stderrDecoder.end();
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(
          new Error(
            stderr.trim() || stdout.trim() || `Claude exited with code ${code}`,
          ),
        );
      }
    });
  });
}
