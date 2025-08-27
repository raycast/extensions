import path from "node:path";
import { Cache, getPreferenceValues, open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { HTTPError } from "got";
import { SubprocessError } from "nano-spawn";
import * as api from "./api.js";
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

/**
 * Handle Got HTTPError and show a failure toast with re-authorization action.
 */
export const handleGotHttpError = (error: HTTPError) => {
  showFailureToast([error.message, error.response.body].join("\n"), {
    title: error.message,
    message: error.response.body,
    primaryAction:
      // [TODO] Needs a better way to detect if the permission scope is insufficient.
      // For now, we just check if the status code is 422 Unprocessable Entity.
      error.response.statusCode === 422
        ? {
            title: "Re-authorize GitHub",
            onAction: async () => {
              // Remove the stored tokens to force re-authorization.
              await api.githubOauthService.client.removeTokens();
              // Due to Raycast `launchCommand` cannot launch itself, we need to use the URL scheme to open the extension as a workaround.
              await open("raycast://extensions/litomore/forked-extensions/manage-forked-extensions");
            },
          }
        : undefined,
  });
};

/**
 * Handle nano-spawn SubprocessError and show a failure toast.
 */
export const handleSubprocessError = (error: SubprocessError) => {
  showFailureToast([error.message, error.stderr].join("\n"), {
    title: error.message,
    message: error.stderr,
  });
};
