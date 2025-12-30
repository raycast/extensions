import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getWorkspaceRoot, isAutoEditEnabled } from "../utils/workspace";

const execFileAsync = promisify(execFile);

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
const READ_ONLY_COMMANDS: GitSubcommand[] = ["status", "diff", "log", "branch", "show"];

// Stash subcommands that are read-only (list, show)
// Note: git stash without args, pop, drop, apply, push, etc. all modify the repository
const READ_ONLY_STASH_SUBCOMMANDS = new Set(["list", "show"]);

// Dangerous flags that should be blocked (normalized form without values)
const DANGEROUS_FLAGS = new Set([
  "--force",
  "--force-with-lease",
  "--hard",
  "--delete",
  "-D", // delete branch shorthand
]);

// Dangerous flag patterns for specific subcommands
// Maps subcommand -> set of dangerous short flags
const DANGEROUS_SHORT_FLAGS_BY_COMMAND: Record<string, Set<string>> = {
  push: new Set(["-f"]), // -f is --force for push
  clean: new Set(["-f", "-d"]), // -f is force, -d removes directories
  branch: new Set(["-D"]), // -D is force delete
};

const MAX_OUTPUT = 10000;
const DEFAULT_TIMEOUT = 30000;

/**
 * Parse arguments string into individual tokens, respecting quoted strings
 */
function parseArgs(args: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inQuote: string | null = null;

  for (let i = 0; i < args.length; i++) {
    const char = args[i];

    if (inQuote) {
      if (char === inQuote) {
        // End of quoted string - add the content without quotes
        tokens.push(current);
        current = "";
        inQuote = null;
      } else {
        current += char;
      }
    } else if (char === '"' || char === "'") {
      // Start of quoted string
      if (current) {
        tokens.push(current);
        current = "";
      }
      inQuote = char;
    } else if (/\s/.test(char)) {
      // Whitespace outside quotes - end current token
      if (current) {
        tokens.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }

  // Add any remaining token
  if (current) {
    tokens.push(current);
  }

  return tokens;
}

/**
 * Normalize a flag by removing any value (e.g., "--force=true" -> "--force")
 */
function normalizeFlag(flag: string): string {
  const equalsIndex = flag.indexOf("=");
  if (equalsIndex !== -1) {
    return flag.slice(0, equalsIndex);
  }
  return flag;
}

/**
 * Extract individual short flags from combined form (e.g., "-fd" -> ["-f", "-d"])
 */
function expandShortFlags(flag: string): string[] {
  // Only expand if it's a short flag (starts with single dash, not double)
  if (flag.startsWith("-") && !flag.startsWith("--") && flag.length > 2) {
    return flag
      .slice(1)
      .split("")
      .map((c) => `-${c}`);
  }
  return [flag];
}

/**
 * Check if the command arguments contain dangerous patterns
 */
function containsDangerousPattern(subcommand: string, args: string): string | null {
  const tokens = parseArgs(args);
  const dangerousShortFlags = DANGEROUS_SHORT_FLAGS_BY_COMMAND[subcommand] || new Set();

  for (const token of tokens) {
    // Skip non-flag arguments
    if (!token.startsWith("-")) {
      continue;
    }

    // Check long flags (normalize to handle --flag=value syntax)
    if (token.startsWith("--")) {
      const normalized = normalizeFlag(token).toLowerCase();
      if (DANGEROUS_FLAGS.has(normalized)) {
        return normalized;
      }
      continue;
    }

    // Check short flags (expand combined flags like -fd)
    const expandedFlags = expandShortFlags(token);
    for (const flag of expandedFlags) {
      // Check global dangerous flags (case-sensitive for -D)
      if (DANGEROUS_FLAGS.has(flag)) {
        return flag;
      }
      // Check subcommand-specific dangerous short flags
      if (dangerousShortFlags.has(flag)) {
        return `${flag} (in git ${subcommand})`;
      }
    }
  }

  return null;
}

/**
 * Check if a git command is read-only (doesn't modify the repository)
 */
function isReadOnlyCommand(subcommand: GitSubcommand, args: string): boolean {
  if (READ_ONLY_COMMANDS.includes(subcommand)) {
    return true;
  }

  // Special handling for stash - only list and show are read-only
  if (subcommand === "stash") {
    const tokens = parseArgs(args);
    const stashSubcommand = tokens[0];
    if (stashSubcommand === undefined) {
      return false; // git stash without args creates a new stash (write operation)
    }
    return READ_ONLY_STASH_SUBCOMMANDS.has(stashSubcommand);
  }

  return false;
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
  const dangerousPattern = containsDangerousPattern(subcommand, args);
  if (dangerousPattern) {
    throw new Error(
      `Dangerous git operation detected: "${dangerousPattern}". ` +
        "This operation is blocked for safety. Please use the git CLI directly if you really need this.",
    );
  }

  // Read-only commands don't need confirmation
  if (isReadOnlyCommand(subcommand, args)) {
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
  const dangerousPattern = containsDangerousPattern(subcommand, args);
  if (dangerousPattern) {
    throw new Error(`Dangerous git operation blocked: "${dangerousPattern}"`);
  }

  const workspaceRoot = getWorkspaceRoot();
  const command = `git ${subcommand}${args ? ` ${args}` : ""}`;

  // Parse args into an array for safe execution
  // This avoids shell interpretation entirely by passing arguments directly to git
  const gitArgs = [subcommand, ...parseArgs(args)];

  try {
    // Execute git directly without a shell wrapper to prevent shell injection
    const { stdout, stderr } = await execFileAsync("git", gitArgs, {
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
