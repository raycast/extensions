import { exec } from "node:child_process";
import { promisify } from "node:util";
import { getWorkspaceRoot, isAutoEditEnabled } from "../utils/workspace";

const execAsync = promisify(exec);

type GitSubcommand =
  | "status"
  | "diff"
  | "log"
  | "add"
  | "commit"
  | "branch"
  | "show"
  | "stash"
  | "checkout"
  | "pull"
  | "fetch";

type Input = {
  /**
   * The git subcommand to execute
   */
  subcommand: GitSubcommand;
  /**
   * Optional: Additional arguments for the git command
   */
  args?: string;
};

// Commands that don't modify the repository (read-only)
const READ_ONLY_COMMANDS: GitSubcommand[] = ["status", "diff", "log", "branch", "show", "stash"];

// Dangerous argument patterns that should be blocked
const DANGEROUS_PATTERNS = [
  "--force",
  "-f",
  "--hard",
  "clean -fd",
  "clean -f",
  "--delete",
  "-D",
  "reset --hard",
  "push --force",
  "push -f",
];

const MAX_OUTPUT = 10000;
const DEFAULT_TIMEOUT = 30000;

/**
 * Check if the command arguments contain dangerous patterns
 */
function containsDangerousPattern(args: string): string | null {
  const argsLower = args.toLowerCase();
  for (const pattern of DANGEROUS_PATTERNS) {
    if (argsLower.includes(pattern.toLowerCase())) {
      return pattern;
    }
  }
  return null;
}

/**
 * Truncate output to prevent extremely large responses
 */
function truncateOutput(output: string, maxLength: number): string {
  if (output.length <= maxLength) return output;
  return output.slice(0, maxLength) + `\n... (truncated, ${output.length - maxLength} more characters)`;
}

/**
 * Confirmation handler for git commands
 * - Read-only commands don't need confirmation
 * - Dangerous patterns are blocked entirely
 * - Other write commands respect autoEdit preference
 */
export async function confirmation({ subcommand, args = "" }: Input) {
  // Check for dangerous patterns first
  const dangerousPattern = containsDangerousPattern(args);
  if (dangerousPattern) {
    throw new Error(
      `Dangerous git operation detected: "${dangerousPattern}". ` +
        "This operation is blocked for safety. Please use the git CLI directly if you really need this.",
    );
  }

  // Read-only commands don't need confirmation
  if (READ_ONLY_COMMANDS.includes(subcommand)) {
    return undefined;
  }

  // Check autoEdit preference for write commands
  if (isAutoEditEnabled()) {
    return undefined;
  }

  // Show confirmation for write commands
  const fullCommand = `git ${subcommand}${args ? ` ${args}` : ""}`;
  return {
    message: `Execute git command?`,
    info: [{ name: "Command", value: fullCommand }],
  };
}

export default async function ({ subcommand, args = "" }: Input) {
  // Validate subcommand
  const validSubcommands: GitSubcommand[] = [
    "status",
    "diff",
    "log",
    "add",
    "commit",
    "branch",
    "show",
    "stash",
    "checkout",
    "pull",
    "fetch",
  ];

  if (!validSubcommands.includes(subcommand)) {
    throw new Error(`Invalid git subcommand: "${subcommand}". ` + `Allowed commands: ${validSubcommands.join(", ")}`);
  }

  // Double-check for dangerous patterns (in case confirmation was bypassed)
  const dangerousPattern = containsDangerousPattern(args);
  if (dangerousPattern) {
    throw new Error(`Dangerous git operation blocked: "${dangerousPattern}"`);
  }

  const workspaceRoot = getWorkspaceRoot();
  const command = `git ${subcommand}${args ? ` ${args}` : ""}`;

  // Use interactive login shell to ensure git is found
  const userShell = process.env.SHELL || "/bin/zsh";
  const wrappedCommand = `${userShell} -l -i -c ${JSON.stringify(command)}`;

  try {
    const { stdout, stderr } = await execAsync(wrappedCommand, {
      cwd: workspaceRoot,
      timeout: DEFAULT_TIMEOUT,
      maxBuffer: 1024 * 1024 * 5, // 5MB buffer
      env: {
        ...process.env,
        // Disable git pager for consistent output
        GIT_PAGER: "",
        // Ensure consistent output formatting
        FORCE_COLOR: "0",
        NO_COLOR: "1",
      },
    });

    return {
      success: true,
      command,
      output: truncateOutput(stdout || stderr, MAX_OUTPUT),
    };
  } catch (error: unknown) {
    const execError = error as {
      code?: number;
      stdout?: string;
      stderr?: string;
      message?: string;
    };

    return {
      success: false,
      command,
      exitCode: execError.code || 1,
      output: truncateOutput(execError.stdout || "", MAX_OUTPUT),
      error: truncateOutput(execError.stderr || execError.message || "Unknown error", MAX_OUTPUT),
    };
  }
}
