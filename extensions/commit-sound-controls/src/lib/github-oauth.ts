import { OAuth } from "@raycast/api";
import { OAuthService } from "@raycast/utils";

const scope = "read:user";
const raycastGitHubClientId = "7235fe8d42157f1f38c0";

export type GitHubProfile = {
  login: string;
  html_url: string;
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
