import React from "react";
import { List, OAuth } from "@raycast/api";
import { getAuthToken } from "@doist/todoist-api-typescript";
import { todoist } from "./api";

// Register a new OAuth app via https://developer.todoist.com/appconsole.html
// For the redirect URL enter: https://raycast.com/redirect?packageName=Extension
// For the website URL enter: https://raycast.com
const clientId = "5cea87f8ec384c288a64cabea53ba218";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Todoist",
  providerIcon: "todoist.png",
  description: "Connect your Todoist account",
});

export async function authorize(): Promise<OAuth.TokenResponse> {
  const authRequest = await client.authorizationRequest({
    endpoint: "https://todoist.com/oauth/authorize",
    clientId: clientId,
    scope: "task:add,data:read_write,data:delete,project:delete",
  });

  // Redirect to OAuth page
  const { authorizationCode } = await client.authorize(authRequest);

  // Fetch access_token
  const tokenResponse = await getAuthToken({
    clientId: clientId,
    clientSecret: "1f874f6f6147452e80ec70fd0dc82df1",
    code: authorizationCode,
  });

  const tokens: OAuth.TokenResponse = {
    access_token: tokenResponse.accessToken,
  };

  // Save access_token
  await client.setTokens(tokens);

  return tokens;
}

export async function getToken(): Promise<string> {
  const tokens = await client.getTokens();
  if (tokens?.accessToken) {
    return tokens?.accessToken;
  }

  await authorize();
  return await getToken();
}

export const withOAuth = () => (Component: React.ComponentType) => {
  return () => {
    const [accessToken, setAccessToken] = React.useState<string>();

    React.useEffect(() => {
      getToken().then((token) => {
        setAccessToken(token);
      });
    }, []);

    if (!accessToken) {
      return <List isLoading />;
    }

    todoist.authToken = accessToken;

    return <Component />;
  };
};
