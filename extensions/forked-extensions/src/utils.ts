import os from "node:os";
import path from "node:path";
import { Cache, getPreferenceValues } from "@raycast/api";
import { upstreamRepository } from "./constants.js";
import { CommitDiff, ForkedExtension } from "./types.js";

export const {
  gitExecutableFilePath,
  gitRemoteType,
  githubPersonalAccessToken,
  repositoryConfigurationPath,
  openWith,
} = getPreferenceValues<ExtensionPreferences>();

/**
 * A cache instance to store data temporarily.
 */
export const cache = new Cache();

/**
 * Returns true if the current platform is macOS.
 */
export const isMac = process.platform === "darwin";

/**
 * Returns true if the current platform is Windows.
 */
export const isWindows = process.platform === "win32";

/**
 * Resolves the path to the repository configuration.
 * @remarks If the path starts with `~/`, it will be resolved to the user's home directory.
 * @param input The input path to resolve.
 * @returns The resolved path.
 */
export const resolvePath = (input: string) =>
  input.startsWith("~/") ? path.join(os.homedir(), input.slice(2)) : input;

/**
 * Simplifies a file path by replacing the home directory with a tilde.
 * @param filePath The file path to simplify.
 * @returns The simplified file path.
 */
export const simplifyPath = (filePath: string) => {
  const home = os.homedir();
  if (filePath.startsWith(home)) return filePath.replace(home, "~");
  return filePath;
};

/**
 * Returns the cloud-synced root directory if the path is inside a risky location.
 * @param input The file path to check.
 * @returns The simplified risky root path, if any.
 */
export const getCloudSyncedPathRoot = (input: string) => {
  const resolvedPath = resolvePath(input);
  const riskyRoots = [
    path.join(os.homedir(), "Desktop"),
    path.join(os.homedir(), "Documents"),
    path.join(os.homedir(), "Library", "Mobile Documents"),
  ];
  const riskyRoot = riskyRoots.find((root) => resolvedPath === root || resolvedPath.startsWith(`${root}${path.sep}`));
  return riskyRoot ? simplifyPath(riskyRoot) : undefined;
};

/**
 * Returns the actual path to the icon of a forked extension.
 * @param extension The forked extension object.
 * @returns The absolute path to the icon file.
 */
export const getActualIconPath = (extension: ForkedExtension) =>
  path.join(extension.folderPath, "assets", extension.icon);

/**
 * Returns the URL to the user's profile on Raycast website.
 * @param username The username of the Raycast user.
 * @returns The URL to the user's profile.
 */
export const userLink = (username: string) => `https://raycast.com/${username}`;

/**
 * Returns the URL to a specific extension on Raycast website.
 * @param username The username of the Raycast user.
 * @param extension The name of the extension.
 * @returns The URL to the extension.
 */
export const extensionLink = (username: string, extension: string) => `https://raycast.com/${username}/${extension}`;

/**
 * Returns the remote URL for the repository based on the configured remote type in extension preferences.
 * @param repository Optional. The full repository name. Defaults to the upstream repository - `"raycast/extensions"`.
 * @returns The remote URL for the repository.
 */
export const getRemoteUrl = (repository: string = upstreamRepository) => {
  if (gitRemoteType === "https") return `https://github.com/${repository}.git`;
  if (gitRemoteType === "ssh") return `git@github.com:${repository}.git`;
  throw new Error("Invalid URL type. Use 'https' or 'ssh'.");
};

/**
 * Returns a human-readable text for the number of commits.
 * @param commitsCount The number of commits.
 * @returns The human-readable text for the number of commits.
 */
export const getCommitsText = (commitsCount: number) => (commitsCount === 1 ? "1 commit" : `${commitsCount} commits`);

/**
 * Returns a message indicating how many commits the forked repository is ahead and behind.
 * @param commitDiff The commit difference object.
 * @param options Optional. Additional options for the message.
 * @returns The message indicating the commit difference.
 */
export const getCommitDiffMessage = (
  commitDiff: CommitDiff | undefined,
  options?: {
    prependSpace?: boolean;
    includeAhead?: boolean;
    includeParentheses?: boolean;
    includeZeroAhead?: boolean;
    alwaysShow?: boolean;
  },
) => {
  if (!commitDiff) return "";
  const prefix = options?.prependSpace ? " " : "";
  const aheadMessage =
    options?.includeAhead && (options.includeZeroAhead || commitDiff.ahead > 0)
      ? `${getCommitsText(commitDiff.ahead)} ahead, `
      : "";
  const behindMessage = `${getCommitsText(commitDiff.behind)} behind`;
  const hasDiff = options?.alwaysShow || commitDiff.behind > 0;
  const leftParenthese = options?.includeParentheses ? "(" : "";
  const rightParenthese = options?.includeParentheses ? ")" : "";
  return hasDiff ? `${prefix}${leftParenthese}${aheadMessage}${behindMessage}${rightParenthese}` : "";
};

/**
 * Adds quotes to a path if it is in Windows and contains spaces and is not already quoted.
 * @param path The path to add quotes to.
 * @returns The path with quotes added if necessary.
 */
export const addQuotesIfInWindows = (path: string) => {
  return isWindows && path.includes(" ") && !(path.startsWith('"') && path.endsWith('"')) ? `"${path}"` : path;
};
