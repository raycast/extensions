import fs from "fs";
import {
  AgentAction,
  buildAgentActionArgs,
  buildDispatchAgentArgs,
  buildListAgentsArgs,
  ClaudeAgentSession,
  DispatchAgentOptions,
  isAgentControlVersionSupported,
  isDaemonUnreachableMessage,
  MIN_AGENT_CONTROL_VERSION,
  parseAgentSessionsJson,
} from "./agent-control-core";
import {
  getClaudePath,
  getClaudeVersion,
  runClaudeCommand,
  startClaudeDaemon,
} from "./claude-cli";
import { expandTilde } from "./terminal";

const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;

let capabilityCheck: Promise<void> | undefined;

async function requireAgentControl(): Promise<void> {
  if (capabilityCheck) return capabilityCheck;
  capabilityCheck = (async () => {
    const [claudePath, version] = await Promise.all([
      getClaudePath(),
      getClaudeVersion(),
    ]);
    if (!claudePath) {
      throw new Error("Claude Code is not installed");
    }
    if (!version || !isAgentControlVersionSupported(version)) {
      throw new Error(
        `Manage Agents requires Claude Code ${MIN_AGENT_CONTROL_VERSION} or later`,
      );
    }
  })();
  return capabilityCheck;
}

async function runClaude(
  args: string[],
  options: { cwd?: string; timeoutMs?: number } = {},
): Promise<{ stdout: string; stderr: string }> {
  await requireAgentControl();
  try {
    return await runClaudeCommand(args, {
      cwd: options.cwd,
      timeoutMs: options.timeoutMs ?? 10_000,
      maxBuffer: MAX_OUTPUT_BYTES,
      includePreferenceAuth: false,
    });
  } catch (error) {
    const details = error as Error & { stderr?: string; stdout?: string };
    const message = details.stderr?.trim() || details.stdout?.trim();
    throw new Error(message || details.message || "Claude command failed");
  }
}

export async function listAgentSessions(
  includeCompleted = false,
): Promise<ClaudeAgentSession[]> {
  const { stdout } = await runClaude(buildListAgentsArgs(includeCompleted));
  return parseAgentSessionsJson(stdout);
}

export async function runAgentAction(
  action: Exclude<AgentAction, "attach">,
  id: string,
): Promise<string> {
  const args = buildAgentActionArgs(action, id);
  const timeoutMs = action === "logs" ? 10_000 : 30_000;
  let result: { stdout: string; stderr: string };
  try {
    result = await runClaude(args, { timeoutMs });
  } catch (error) {
    if (
      (action !== "stop" && action !== "rm") ||
      !isDaemonUnreachableMessage(
        error instanceof Error ? error.message : String(error),
      )
    ) {
      throw error;
    }
    await startClaudeDaemon();
    const deadline = Date.now() + 10_000;
    for (;;) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      try {
        result = await runClaude(args, { timeoutMs });
        break;
      } catch (retryError) {
        if (
          !isDaemonUnreachableMessage(
            retryError instanceof Error
              ? retryError.message
              : String(retryError),
          ) ||
          Date.now() >= deadline
        ) {
          throw retryError;
        }
      }
    }
  }
  const { stdout, stderr } = result;
  return stdout.trim() || stderr.trim();
}

export async function dispatchAgent(
  options: DispatchAgentOptions,
): Promise<string> {
  const projectPath = expandTilde(options.projectPath);
  let stat: fs.Stats;
  try {
    stat = await fs.promises.stat(projectPath);
  } catch {
    throw new Error("Project directory does not exist");
  }
  if (!stat.isDirectory()) throw new Error("Project path is not a directory");

  const { stdout, stderr } = await runClaude(buildDispatchAgentArgs(options), {
    cwd: projectPath,
    timeoutMs: 30_000,
  });
  return stdout.trim() || stderr.trim();
}
