import { runAppleScript } from "@raycast/utils";
import { DEFAULT_SHELL } from "./constants";
import { getBinaryPath } from "./container";

/** Single-quotes a value for safe use in a POSIX shell command line. */
function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

/** Escapes a string for embedding inside an AppleScript double-quoted literal. */
function appleScriptQuote(command: string): string {
  return command.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/** Opens Terminal.app and runs the given command line in a new session. */
async function openInTerminal(command: string): Promise<void> {
  const script = [
    'tell application "Terminal"',
    "  activate",
    `  do script "${appleScriptQuote(command)}"`,
    "end tell",
  ].join("\n");
  await runAppleScript(script);
}

/** Opens an interactive shell inside a running container (needs a real TTY). */
export function openExecInTerminal(id: string, shell: string = DEFAULT_SHELL): Promise<void> {
  const binary = getBinaryPath();
  return openInTerminal(`${shellQuote(binary)} exec -it ${shellQuote(id)} ${shellQuote(shell)}`);
}

/** Tails a container's logs live in Terminal.app. */
export function followLogsInTerminal(id: string): Promise<void> {
  const binary = getBinaryPath();
  return openInTerminal(`${shellQuote(binary)} logs -f ${shellQuote(id)}`);
}

/** Tails the system service logs live in Terminal.app. */
export function openSystemLogsInTerminal(): Promise<void> {
  const binary = getBinaryPath();
  return openInTerminal(`${shellQuote(binary)} system logs -f`);
}

/** Starts the system service in Terminal.app (useful when first-run prompts appear). */
export function startServiceInTerminal(): Promise<void> {
  const binary = getBinaryPath();
  return openInTerminal(`${shellQuote(binary)} system start`);
}
