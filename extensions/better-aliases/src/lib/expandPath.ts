import { homedir } from "os";

/**
 * Expands environment variables and tildes in file paths
 * Supports: $HOME, ${HOME}, ~
 * @param path - The path that may contain environment variables
 * @returns The expanded path
 */
export function expandPath(path: string): string {
  if (!path) return path;

  let expandedPath = path;

  // Expand $HOME and ${HOME}
  expandedPath = expandedPath.replace(/\$\{?HOME\}?/g, homedir());

  // Expand tilde (~) at the beginning of the path
  if (expandedPath.startsWith("~/")) {
    expandedPath = expandedPath.replace(/^~/, homedir());
  }

  // Handle other common environment variables if needed
  // expandedPath = expandedPath.replace(/\$\{?USER\}?/g, process.env.USER || "");

  return expandedPath;
}

/**
 * Extracts the path from a command that starts with "open"
 * @param command - The command string (e.g., "open $HOME/Downloads")
 * @returns The path portion of the command, or the original command if it doesn't start with "open"
 */
export function extractPathFromOpenCommand(command: string): string {
  const trimmedCommand = command.trim();

  // Check if the command starts with "open "
  if (trimmedCommand.toLowerCase().startsWith("open ")) {
    // Extract everything after "open "
    return trimmedCommand.slice(5).trim();
  }

  // Return the original command if it's not an "open" command
  return command;
}

/**
 * Determines if a command is an "open" command that should have its path expanded
 * @param command - The command string
 * @returns true if this is an "open" command, false otherwise
 */
export function isOpenCommand(command: string): boolean {
  return command.trim().toLowerCase().startsWith("open ");
}
