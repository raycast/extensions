import { OAuthService } from "@raycast/utils";

// Signing in with GitHub is only for Copilot. The `read:user` scope is the smallest one that lets the Copilot endpoint
// answer for the signed-in account.
const github = OAuthService.github({ scope: "read:user" });

// Reads the token that a previous sign-in stored, without opening the sign-in page. The command calls this on load, so
// it must never prompt. An expired token is reported as signed out, which shows the sign-in action again.
export async function getGitHubToken(): Promise<string | undefined> {
  const tokens = await github.client.getTokens();
  if (!tokens || tokens.isExpired()) {
    return undefined;
  }
  return tokens.accessToken;
}

// Opens the GitHub sign-in in the browser and stores the token it returns. Throws when the user cancels or it fails.
export async function signInWithGitHub(): Promise<string> {
  return github.authorize();
}

export async function signOutOfGitHub(): Promise<void> {
  await github.client.removeTokens();
}
