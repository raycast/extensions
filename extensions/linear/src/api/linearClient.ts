import { LinearClient, LinearGraphQLClient } from "@linear/sdk";
import { environment } from "@raycast/api";
import { OAuthService } from "@raycast/utils";

let linearClient: LinearClient | null = null;

export const linear = OAuthService.linear({
  scope: "read write",
  onAuthorize({ token }) {
    linearClient = new LinearClient({
      accessToken: token,
      headers: {
        "public-file-urls-expire-in": "60",
        "linear-raycast-extension-name": environment.extensionName,
      },
    });
  },
});

export function getLinearClient(): { linearClient: LinearClient; graphQLClient: LinearGraphQLClient } {
  if (!linearClient) {
    throw new Error("No linear client initialized");
  }

  return { linearClient, graphQLClient: linearClient.client };
}
