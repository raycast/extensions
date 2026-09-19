import { getPreferenceValues } from "@raycast/api";
import { OAuthService } from "@raycast/utils";

/**
 * Authentication: Raycast's own GitHub OAuth app, or a personal access token
 * the user pastes into preferences.
 *
 * No device flow is needed — that exists because a distributed app cannot keep
 * a `client_secret`, and Raycast performs the exchange on its own server.
 */
const { personalAccessToken, includePrivateRepos } = getPreferenceValues<Preferences>();

/**
 * Scope is kept minimal: `repo` only when private repositories are wanted,
 * `read:org` to see organization repositories. An unnecessarily broad scope is
 * the most common question in Store review.
 */
const scope = includePrivateRepos ? "repo read:org" : "public_repo read:org";

export const github = OAuthService.github({ scope, personalAccessToken });
