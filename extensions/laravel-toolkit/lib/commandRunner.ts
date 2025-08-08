/**
 * Command runner utilities for determining which Artisan commands can be safely executed
 */

// Commands that are safe to run without additional parameters
const SAFE_RUNNABLE_COMMANDS = new Set([
  "migrate",
  "migrate:status",
  "optimize",
  "optimize:clear",
  "cache:clear",
  "config:clear",
  "route:clear",
  "view:clear",
  "config:cache",
  "route:cache",
  "view:cache",
  "queue:restart",
  "storage:link",
  "about",
  "inspire",
  "env",
  "down",
  "up",
  "list",
  "help",
]);

// Commands that can be run but may have destructive effects - require confirmation
const CAUTION_RUNNABLE_COMMANDS = new Set([
  "migrate:fresh",
  "migrate:reset",
  "migrate:rollback",
  "db:wipe",
  "queue:clear",
  "queue:flush",
]);

// Commands that require parameters or are interactive/long-running
const NON_RUNNABLE_COMMANDS = new Set([
  "tinker",
  "serve",
  "queue:work",
  "queue:listen",
  "schedule:work",
  "schedule:run",
  "make:*", // All make commands require parameters
  "migrate:make",
  "seeder:make",
  "factory:make",
  "test",
  "artisan",
]);

// Patterns for commands that typically require arguments
const REQUIRES_ARGS_PATTERNS = [
  /^make:/,
  /^migrate:.*make/,
  /^db:.*seed/,
  /^route:.*match/,
  /^cache:.*forget/,
  /^config:.*publish/,
  /^vendor:.*publish/,
  /^package:.*discover/,
];

export interface CommandAnalysis {
  isRunnable: boolean;
  requiresConfirmation: boolean;
  reason?: string;
}

/**
 * Analyzes an Artisan command to determine if it can be safely executed
 */
export function analyzeCommand(command: string): CommandAnalysis {
  const trimmedCommand = command.trim();
  
  if (!trimmedCommand) {
    return {
      isRunnable: false,
      requiresConfirmation: false,
      reason: "Empty command",
    };
  }

  // Extract base command (remove flags and arguments)
  const baseCommand = trimmedCommand.split(" ")[0];

  // Check if it's a safe runnable command
  if (SAFE_RUNNABLE_COMMANDS.has(baseCommand)) {
    return {
      isRunnable: true,
      requiresConfirmation: false,
      reason: "Safe to run without parameters",
    };
  }

  // Check if it's a caution command (destructive but runnable)
  if (CAUTION_RUNNABLE_COMMANDS.has(baseCommand)) {
    return {
      isRunnable: true,
      requiresConfirmation: true,
      reason: "⚠️ This command may modify or delete data",
    };
  }

  // Check if it's explicitly non-runnable
  if (NON_RUNNABLE_COMMANDS.has(baseCommand)) {
    return {
      isRunnable: false,
      requiresConfirmation: false,
      reason: "Interactive or long-running command not suitable for this interface",
    };
  }

  // Check patterns that typically require arguments
  for (const pattern of REQUIRES_ARGS_PATTERNS) {
    if (pattern.test(baseCommand)) {
      return {
        isRunnable: false,
        requiresConfirmation: false,
        reason: "Command typically requires additional parameters",
      };
    }
  }

  // Default to non-runnable for unknown commands
  return {
    isRunnable: false,
    requiresConfirmation: false,
    reason: "Unknown command - use 'Run Artisan Command' for custom commands",
  };
}

/**
 * Quick check if a command is runnable
 */
export function isCommandRunnable(command: string): boolean {
  return analyzeCommand(command).isRunnable;
}

/**
 * Check if a command requires confirmation before running
 */
export function requiresConfirmation(command: string): boolean {
  return analyzeCommand(command).requiresConfirmation;
}

/**
 * Get a user-friendly explanation for why a command is or isn't runnable
 */
export function getCommandExplanation(command: string): string {
  const analysis = analyzeCommand(command);
  return analysis.reason || (analysis.isRunnable ? "Runnable" : "Not runnable");
}