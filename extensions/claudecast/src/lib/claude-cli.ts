import { exec, spawn } from "child_process";
import { promisify } from "util";
import { getPreferenceValues } from "@raycast/api";
import path from "path";
import fs from "fs";
import os from "os";

const execPromise = promisify(exec);

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

/**
 * Find the Claude CLI binary path
 */
export async function getClaudePath(): Promise<string | null> {
  const preferences = getPreferenceValues<Preferences>();

  // Check user preference first
  if (preferences.claudeCodePath) {
    try {
      await fs.promises.access(preferences.claudeCodePath, fs.constants.X_OK);
      return preferences.claudeCodePath;
    } catch {
      // Fall through to auto-detection
    }
  }

  // Common installation paths - check these first (more reliable than `which` in sandboxed environments)
  const commonPaths = [
    "/opt/homebrew/bin/claude",
    "/usr/local/bin/claude",
    path.join(os.homedir(), ".npm-global/bin/claude"),
    path.join(os.homedir(), ".local/bin/claude"),
  ];

  // Try common paths first
  for (const p of commonPaths) {
    try {
      await fs.promises.access(p, fs.constants.X_OK);
      return p;
    } catch {
      continue;
    }
  }

  // Try which command as fallback
  try {
    const { stdout } = await execPromise("which claude");
    const claudePath = stdout.trim();
    if (claudePath) {
      return claudePath;
    }
  } catch {
    // which failed
  }

  return null;
}

/**
 * Execute a prompt using Claude CLI
 */
export async function executePrompt(
  prompt: string,
  options: {
    model?: string;
    context?: string;
    cwd?: string;
    sessionId?: string;
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
    fullPrompt,
    "--output-format",
    "stream-json",
    "--verbose",
    "--model",
    model,
  ];

  if (options.sessionId) {
    args.push("-r", options.sessionId);
  }

  // Build environment with authentication
  // Supports both Anthropic API key (pay-as-you-go) and OAuth token (Claude subscription)
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: `${process.env.PATH}:/usr/local/bin:/opt/homebrew/bin`,
    HOME: os.homedir(),
  };

  // API key takes precedence (direct Anthropic API billing)
  if (preferences.anthropicApiKey) {
    env.ANTHROPIC_API_KEY = preferences.anthropicApiKey;
  }
  // OAuth token for Claude subscription users
  if (preferences.oauthToken) {
    env.CLAUDE_CODE_OAUTH_TOKEN = preferences.oauthToken;
  }

  return new Promise((resolve, reject) => {
    const child = spawn(claudePath, args, {
      cwd: options.cwd || os.homedir(),
      env,
      stdio: ["ignore", "pipe", "pipe"], // Close stdin to prevent CLI from waiting
    });

    let stdout = "";
    let stderr = "";

    // Add timeout (2 minutes)
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error("Claude CLI timed out after 2 minutes"));
    }, 120000);

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      clearTimeout(timeout);
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
    fullPrompt,
    "--output-format",
    "stream-json",
    "--model",
    model,
  ];

  // Build environment with authentication
  // Supports both Anthropic API key (pay-as-you-go) and OAuth token (Claude subscription)
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: `${process.env.PATH}:/usr/local/bin:/opt/homebrew/bin`,
    HOME: os.homedir(),
  };

  // API key takes precedence (direct Anthropic API billing)
  if (preferences.anthropicApiKey) {
    env.ANTHROPIC_API_KEY = preferences.anthropicApiKey;
  }
  // OAuth token for Claude subscription users
  if (preferences.oauthToken) {
    env.CLAUDE_CODE_OAUTH_TOKEN = preferences.oauthToken;
  }

  return new Promise((resolve, reject) => {
    const child = spawn(claudePath, args, {
      cwd: options.cwd || os.homedir(),
      env,
      stdio: ["ignore", "pipe", "pipe"], // Close stdin to prevent CLI from waiting
    });

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
      message: "Install: npm install -g @anthropic-ai/claude-code",
    });
  }
  return installed;
}

/**
 * Check if authentication is configured (either API key or OAuth token)
 */
export async function isAuthConfigured(): Promise<boolean> {
  const { getPreferenceValues } = await import("@raycast/api");
  const preferences = getPreferenceValues<Preferences>();
  return !!(preferences.anthropicApiKey || preferences.oauthToken);
}

/**
 * Get Claude CLI version
 */
export async function getClaudeVersion(): Promise<string | null> {
  const claudePath = await getClaudePath();
  if (!claudePath) return null;

  try {
    const { stdout } = await execPromise(`"${claudePath}" --version`);
    return stdout.trim();
  } catch {
    return null;
  }
}
