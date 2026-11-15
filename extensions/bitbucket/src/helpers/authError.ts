export const API_TOKEN_URL = "https://id.atlassian.com/manage-profile/security/api-tokens";

export const REQUIRED_SCOPES = [
  "read:user:bitbucket",
  "read:workspace:bitbucket",
  "read:repository:bitbucket",
  "read:pullrequest:bitbucket",
  "read:pipeline:bitbucket",
];

export interface AuthErrorHelp {
  title: string;
  message: string;
}

// 401 = Bitbucket rejected the email / token pair, 403 = the token is valid but lacks a scope.
// Both are fixed by creating a (scoped) API token, so surface what to do instead of the raw error.
export function getAuthErrorHelp(error: unknown): AuthErrorHelp | undefined {
  const status = (error as { status?: number } | undefined)?.status;
  if (status === 401) {
    return {
      title: "Bitbucket rejected your credentials",
      message:
        "Check that Account Email is your Atlassian account email and that API Token is a valid, scoped API token (not an app password).",
    };
  }
  if (status === 403) {
    return {
      title: "Your API token is missing a scope",
      message: `Create a token with these scopes: ${REQUIRED_SCOPES.join(", ")}.`,
    };
  }
  return undefined;
}
