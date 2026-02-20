import { LinearClient, LinearGraphQLClient } from "@linear/sdk";
import { environment } from "@raycast/api";
import { OAuthService } from "@raycast/utils";

let oauthLinearClient: LinearClient | null = null;
let oauthWorkspaceId: string | null = null;
let activeClient: LinearClient | null = null;

export function createLinearClient(token: string, type: "oauth" | "pat" = "oauth"): LinearClient {
  return new LinearClient({
    ...(type === "pat" ? { apiKey: token } : { accessToken: token }),
    headers: {
      "public-file-urls-expire-in": "60",
      "linear-raycast-extension-name": environment.extensionName,
    },
  });
}

export const linear = OAuthService.linear({
  scope: "read write",
  onAuthorize({ token }) {
    oauthLinearClient = createLinearClient(token);
  },
});

export function setActiveClient(client: LinearClient | null): void {
  activeClient = client;
}

export function getLinearClient(): { linearClient: LinearClient; graphQLClient: LinearGraphQLClient } {
  const client = activeClient ?? oauthLinearClient;
  if (!client) {
    throw new Error("No linear client initialized");
  }

  return { linearClient: client, graphQLClient: client.client };
}

/**
 * Fetches and caches the OAuth workspace ID. Called lazily when needed
 * (e.g., by resolveActiveClient or the Switch Workspace command).
 */
export async function fetchOAuthWorkspaceId(): Promise<string | null> {
  if (oauthWorkspaceId) return oauthWorkspaceId;
  if (!oauthLinearClient) return null;

  try {
    const org = await oauthLinearClient.organization;
    oauthWorkspaceId = org.id;
  } catch {
    // Non-fatal
  }

  return oauthWorkspaceId;
}

export function getOAuthWorkspaceId(): string | null {
  return oauthWorkspaceId;
}

export function getOAuthLinearClient(): LinearClient | null {
  return oauthLinearClient;
}
