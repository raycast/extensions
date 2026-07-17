import { getPreferenceValues } from "@raycast/api";
import { execFile, spawn } from "child_process";
import { promisify } from "util";
import { access, constants } from "fs/promises";
import { z } from "zod";
import { expandTilde } from "./utils";

const execFileAsync = promisify(execFile);

const sessionBase = z.object({
  sessionId: z.string(),
  cwd: z.string(),
  name: z.string().optional(),
  startedAt: z.number().optional(),
  // Present when status is "waiting", e.g. "permission prompt" (also covers plan-mode acceptance)
  waitingFor: z.string().optional(),
});

const interactiveSessionSchema = sessionBase.extend({
  kind: z.literal("interactive"),
  pid: z.number(),
  // "busy" | "idle" | "waiting" today; deliberately open so unknown future values still render
  status: z.string(),
});

const backgroundSessionSchema = sessionBase.extend({
  kind: z.literal("background"),
  // Short job id — the target for `claude stop|rm|attach`
  id: z.string(),
  // "done" today; deliberately open
  state: z.string(),
  pid: z.number().optional(),
  status: z.string().optional(),
});

const sessionSchema = z.discriminatedUnion("kind", [interactiveSessionSchema, backgroundSessionSchema]);

export type BackgroundSession = z.infer<typeof backgroundSessionSchema>;
// Merged dedupe rows (live interactive resume of a background job) carry the job's short id
export type InteractiveSession = z.infer<typeof interactiveSessionSchema> & { jobId?: string };
export type ClaudeSession = InteractiveSession | BackgroundSession;

export function isRunning(session: ClaudeSession): boolean {
  return session.kind === "interactive" || session.pid !== undefined;
}

export class ClaudeBinaryNotFoundError extends Error {
  constructor(searchedPaths: string[]) {
    super(
      `Claude CLI not found. Searched: ${searchedPaths.join(", ")}. ` +
        "Set 'Claude CLI Path' in the command preferences.",
    );
    this.name = "ClaudeBinaryNotFoundError";
  }
}

const BINARY_CANDIDATES = [
  "/opt/homebrew/bin/claude",
  "/usr/local/bin/claude",
  "~/.claude/local/claude",
  "~/.local/bin/claude",
  "~/.bun/bin/claude",
];

let cachedBinaryPath: string | undefined;

async function isExecutable(filepath: string): Promise<boolean> {
  try {
    await access(filepath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export async function resolveClaudeBinary(): Promise<string> {
  if (cachedBinaryPath) return cachedBinaryPath;

  const { claudeBinaryPath } = getPreferenceValues<{ claudeBinaryPath?: string }>();
  const candidates = [...(claudeBinaryPath ? [claudeBinaryPath] : []), ...BINARY_CANDIDATES].map(expandTilde);

  for (const candidate of candidates) {
    if (await isExecutable(candidate)) {
      cachedBinaryPath = candidate;
      return candidate;
    }
  }

  // Raycast does not inherit the shell PATH, but a login shell knows it
  try {
    const { stdout } = await execFileAsync("/bin/zsh", ["-lic", "which claude"], { timeout: 5000 });
    const found = stdout.trim().split("\n").pop()?.trim();
    if (found && (await isExecutable(found))) {
      cachedBinaryPath = found;
      return found;
    }
  } catch {
    // fall through to the not-found error
  }

  throw new ClaudeBinaryNotFoundError(candidates);
}

async function execClaude(args: string[], options?: { cwd?: string; timeout?: number }): Promise<string> {
  const binary = await resolveClaudeBinary();
  try {
    const { stdout } = await execFileAsync(binary, args, {
      timeout: options?.timeout ?? 10_000,
      cwd: options?.cwd,
    });
    return stdout;
  } catch (error) {
    // execFile buries the useful message in stderr
    const stderr = (error as { stderr?: string }).stderr?.trim();
    throw stderr ? new Error(stderr) : error;
  }
}

/**
 * The same sessionId can appear twice: once as a completed background job and
 * once as a live interactive resume of it. Collapse those into a single
 * interactive row that keeps the background job id for `claude rm`.
 */
function mergeDuplicate(a: ClaudeSession, b: ClaudeSession): ClaudeSession {
  if (a.kind === "interactive" && b.kind === "background") return { ...a, jobId: b.id };
  if (a.kind === "background" && b.kind === "interactive") return { ...b, jobId: a.id };
  if (a.kind === "background" && b.kind === "background") return a.pid !== undefined ? a : b;
  return a;
}

export async function listSessions(): Promise<ClaudeSession[]> {
  const stdout = await execClaude(["agents", "--all", "--json"]);
  const entries = z.array(z.unknown()).parse(JSON.parse(stdout));

  const bySessionId = new Map<string, ClaudeSession>();
  for (const entry of entries) {
    // Validate per element so one malformed entry does not reject the whole list
    const parsed = sessionSchema.safeParse(entry);
    if (!parsed.success) continue;

    const existing = bySessionId.get(parsed.data.sessionId);
    bySessionId.set(parsed.data.sessionId, existing ? mergeDuplicate(existing, parsed.data) : parsed.data);
  }

  return [...bySessionId.values()];
}

// `claude stop|rm` refuse to act when they cannot confirm the job's worker is
// dead. That check needs the on-demand background daemon, which those commands
// never start themselves — once it idle-exits, they fail deterministically
// until the daemon runs again. Depending on command and CLI version the
// message is "couldn't confirm <id> was stopped — …" or
// "couldn't remove <id> — the background service may be restarting …".
function isDaemonUnreachableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    /couldn't confirm .* was stopped/.test(error.message) ||
    error.message.includes("background service may be restarting")
  );
}

// Start the background daemon supervisor detached. It exits by itself ~5s
// after the last client disconnects, and bails when one is already running,
// so there is nothing to clean up or guard against.
async function startDaemon(): Promise<void> {
  const binary = await resolveClaudeBinary();
  spawn(binary, ["daemon", "run"], { detached: true, stdio: "ignore" }).unref();
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function execClaudeWithDaemonRetry(args: string[]): Promise<void> {
  try {
    await execClaude(args, { timeout: 15_000 });
    return;
  } catch (error) {
    if (!isDaemonUnreachableError(error)) throw error;
  }

  await startDaemon();
  const deadline = Date.now() + 10_000;
  for (;;) {
    await delay(500);
    try {
      await execClaude(args, { timeout: 15_000 });
      return;
    } catch (error) {
      if (!isDaemonUnreachableError(error) || Date.now() >= deadline) throw error;
    }
  }
}

export async function stopSession(id: string): Promise<void> {
  await execClaudeWithDaemonRetry(["stop", id]);
}

export async function removeSession(id: string): Promise<void> {
  await execClaudeWithDaemonRetry(["rm", id]);
}

export async function dispatchBackgroundAgent(directory: string, prompt: string, name?: string): Promise<void> {
  await execClaude(["--bg", prompt, ...(name ? ["-n", name] : [])], {
    cwd: expandTilde(directory),
    timeout: 30_000,
  });
}
