import { LinearClient, LinearGraphQLClient } from "@linear/sdk";
import { environment } from "@raycast/api";
import { OAuthService, withAccessToken } from "@raycast/utils";
import type { ComponentType } from "react";

let linearClient: LinearClient | null = null;

export const linear = OAuthService.linear({
  scope: "read",
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

export function withLinearClient<T>(Component: ComponentType<T>) {
  return withAccessToken<T>(linear)(Component);
}

export function getLinearClient(): { linearClient: LinearClient; graphQLClient: LinearGraphQLClient } {
  if (!linearClient) {
    throw new Error("No Linear client initialized");
  }

  return { linearClient, graphQLClient: linearClient.client };
}
