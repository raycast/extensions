import { OAuth } from "@raycast/api";
import { OAuthService } from "@raycast/utils";

// `read:org` lets the organization picker include private memberships. Rules
// still work without OAuth; this scope is only used to make picking easier.
const scope = "read:user read:org";
const raycastGitHubClientId = "7235fe8d42157f1f38c0";

export type GitHubProfile = {
  login: string;
  html_url: string;
};

export type GitHubOrganization = {
  login: string;
  avatarUrl: string;
  htmlUrl: string;
};

const legacyGitHub = OAuthService.github({ scope });

function serviceForSlot(slot: string): OAuthService {
  if (slot === "legacy") return legacyGitHub;

  const client = new OAuth.PKCEClient({
    redirectMethod: OAuth.RedirectMethod.Web,
    providerName: "GitHub",
    providerIcon: "icon.png",
    providerId: `commit-sounds-${slot}`,
    description: "Connect this GitHub account to Commit Sounds",
  });

  return new OAuthService({
    client,
    clientId: raycastGitHubClientId,
    scope,
    authorizeUrl: "https://github.oauth.raycast.com/authorize",
    tokenUrl: "https://github.oauth.raycast.com/token",
  });
}

export async function authorizeGitHubAccount(
  slot: string,
): Promise<GitHubProfile> {
  const token = await serviceForSlot(slot).authorize();
  const response = await fetch("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!response.ok) throw new Error(`GitHub returned ${response.status}.`);
  return (await response.json()) as GitHubProfile;
}

export async function signOutGitHubAccount(slot: string): Promise<void> {
  await serviceForSlot(slot).client.removeTokens();
}

/**
 * Lists organizations available to one stored OAuth identity. This is kept
 * separate from sound-rule matching: an organization is still just the owner
 * segment of a repository's GitHub remote, so users can always add one
 * manually even when GitHub does not expose a membership to OAuth.
 */
export async function listGitHubOrganizations(
  slot: string,
): Promise<GitHubOrganization[]> {
  const tokens = await serviceForSlot(slot).client.getTokens();
  if (!tokens?.accessToken) return [];

  const response = await fetch(
    "https://api.github.com/user/orgs?per_page=100",
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${tokens.accessToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`GitHub returned ${response.status}.`);
  }

  const organizations = (await response.json()) as Array<{
    login: string;
    avatar_url: string;
    html_url: string;
  }>;
  return organizations.map((organization) => ({
    login: organization.login,
    avatarUrl: organization.avatar_url,
    htmlUrl: organization.html_url,
  }));
}
