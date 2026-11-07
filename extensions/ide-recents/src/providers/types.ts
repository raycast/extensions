/**
 * IDEProvider — the interface behind every supported editor.
 *
 * Each editor (VS Code, Trae, Antigravity, ...) implements it to expose its
 * database paths, its open commands and its branding. Adding an editor means
 * adding one file next to this one and registering it in registry.ts.
 */

/**
 * One candidate open command.
 *
 * The executable and its arguments are kept apart so callers can run them with
 * `execFile` without a shell. A project path then travels as a single argument:
 * characters such as spaces, quotes, `$()` or backticks are never interpreted,
 * and a path containing them still opens.
 */
export interface OpenCommand {
  /** Absolute path of the executable, or a command name resolved through PATH */
  command: string;
  /** Arguments handed to the executable one by one (never concatenated or escaped) */
  args: string[];
}

export interface IDEProvider {
  /** Stable identifier */
  id: string;
  /** Display name */
  name: string;
  /** Brand color (hex) */
  color: string;
  /**
   * Candidate database paths, most relevant first.
   * Reading and cleanup cover every path that exists, not just the first one.
   */
  getDatabasePaths(): string[];
  /**
   * Candidate open commands, tried in order.
   * The project path must stay a separate argument and must never be
   * concatenated into the command string.
   */
  getOpenCommands(projectPath: string): OpenCommand[];
}

export interface ProjectItem {
  id: string;
  name: string;
  /**
   * What the editor should open:
   * - a filesystem path for local projects;
   * - the original URI for remote / virtual workspaces
   *   (`vscode-remote://`, `vscode-vfs://`, ...).
   */
  path: string;
  type: "folder" | "workspace" | "remote" | "file";
  extension: string;
  /** Editors this path was opened from (the same path can come from several) */
  sources: string[];
  /** Whether the local path exists; always true for remote / virtual workspaces */
  exists?: boolean;
}
