/**
 * The upstream repository name for the Raycast extensions.
 */
export const upstreamRepository = "raycast/extensions";

/**
 * The HTTPS remote URL for the Raycast extensions repository.
 */
export const raycastGitRemoteHttps = `https://github.com/${upstreamRepository}.git`;

/**
 * The SSH remote URL for the Raycast extensions repository.
 */
export const raycastGitRemoteSsh = `git@github.com:${upstreamRepository}.git`;

/**
 * The default Git executable file path.
 */
export const defaultGitExecutableFilePath = "git";

/**
 * The GitHub OAuth required scope.
 */
export const githubOauthScope = "public_repo workflow";
