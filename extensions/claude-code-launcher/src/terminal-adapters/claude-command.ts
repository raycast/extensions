import { TerminalOpenOptions } from "./types";

const SAFE_ARG_PATTERN = /^[A-Za-z0-9@%_+=:,./-]+$/;

function shellQuoteArg(arg: string): string {
  return SAFE_ARG_PATTERN.test(arg) ? arg : `'${arg.replace(/'/g, "'\\''")}'`;
}

/**
 * Builds the claude invocation embedded in each adapter's shell command.
 * Session ids and flags match the safe pattern, so the common results are
 * plain `claude`, `claude attach <id>`, or `claude --resume <uuid> --fork-session`.
 */
export function buildClaudeCommand(options?: TerminalOpenOptions): string {
  const args = options?.claudeArgs ?? [];
  return ["claude", ...args.map(shellQuoteArg)].join(" ");
}
