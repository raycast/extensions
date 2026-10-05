import { LinearClient, LinearGraphQLClient } from "@linear/sdk";
import { environment } from "@raycast/api";
import { OAuthService } from "@raycast/utils";

let linearClient: LinearClient | null = null;

type GraphQLResult<Data> = { data?: Data; errors?: Array<{ message?: string }> };

async function makeGraphQLRequest<Data, Variables extends Record<string, unknown>>(
  url: string,
  options: RequestInit,
  query: string,
  variables?: Variables,
  requestHeaders?: RequestInit["headers"],
) {
  const body = JSON.stringify({ query, variables });
  const headers = new Headers(options.headers);
  new Headers(requestHeaders).forEach((value, key) => headers.set(key, value));
  headers.set("Content-Type", "application/json");

  const response = await fetch(url, {
    ...options,
    method: "POST",
    headers: Object.fromEntries(headers.entries()),
    body,
  });
  const result: string | GraphQLResult<Data> = response.headers.get("Content-Type")?.startsWith("application/json")
    ? ((await response.json()) as GraphQLResult<Data>)
    : await response.text();

  if (typeof result !== "string" && response.ok && !result.errors && result.data) {
    return { ...result, headers: response.headers, status: response.status };
  }

  throw new Error(
    typeof result === "string" ? result : (result.errors?.[0]?.message ?? `GraphQL Error (${response.status})`),
  );
}

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

    const graphQLClient = linearClient.client as unknown as {
      url: string;
      options: RequestInit;
      rawRequest: LinearGraphQLClient["rawRequest"];
    };
    graphQLClient.rawRequest = ((query, variables, requestHeaders) =>
      makeGraphQLRequest(
        graphQLClient.url,
        graphQLClient.options,
        query,
        variables,
        requestHeaders,
      )) as LinearGraphQLClient["rawRequest"];
  },
});

export function getLinearClient(): { linearClient: LinearClient; graphQLClient: LinearGraphQLClient } {
  if (!linearClient) {
    throw new Error("No linear client initialized");
  }

  return { linearClient, graphQLClient: linearClient.client };
}
