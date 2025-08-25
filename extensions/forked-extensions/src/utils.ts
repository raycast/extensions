import path from "node:path";
import { Cache, getPreferenceValues } from "@raycast/api";
import { ForkedExtension } from "./types.js";

const { gitRemoteType } = getPreferenceValues<ExtensionPreferences>();

export const cache = new Cache();

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
 * @param repository Optional. The full repository name. Defaults to `"raycast/extensions"`.
 * @returns The remote URL for the repository.
 */
export const getRemoteUrl = (repository: string = "raycast/extensions") => {
  if (gitRemoteType === "https") return `https://github.com/${repository}.git`;
  if (gitRemoteType === "ssh") return `git@github.com:${repository}.git`;
  throw new Error("Invalid URL type. Use 'https' or 'ssh'.");
};
