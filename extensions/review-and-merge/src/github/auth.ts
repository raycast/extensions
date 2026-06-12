import { getPreferenceValues } from "@raycast/api";
import { OAuthService } from "@raycast/utils";

interface Preferences {
  githubToken?: string;
}

const personalAccessToken =
  getPreferenceValues<Preferences>().githubToken?.trim() || undefined;

/**
 * GitHub authentication for the extension.
 *
 * By default this uses OAuth via Raycast's built-in GitHub OAuth app (no
 * client ID required). If the user provides a Personal Access Token in
 * preferences, that token is used instead and the OAuth flow is skipped.
 *
 * Scope: `repo` — required to list, approve, and merge pull requests across
 * the repositories the user has access to (including private ones).
 */
export const github = OAuthService.github({
  scope: "repo",
  personalAccessToken,
});
