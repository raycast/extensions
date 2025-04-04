import { Alert, confirmAlert, getPreferenceValues, LocalStorage, OAuth } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import fetch, { RequestInit } from "node-fetch";

interface workspace {
  id: string;
  name: string;
  url: string;
}

interface User {
  id: string;
  workspace: workspace;
}

export const baseURI = "https://api.awork.com/api/v1";
export let authorizationInProgress = false;
export let revalidating = false;

const preferences = getPreferenceValues<Preferences>();

export const client = new OAuth.PKCEClient({
  providerName: "awork",
  redirectMethod: OAuth.RedirectMethod.Web,
  description: "Connect your awork account...",
});

const getRequestOptions = (body: URLSearchParams): RequestInit => ({
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
    Authorization: `Basic ${btoa(preferences.clientId + ":" + preferences.clientSecret)}`,
  },
  body: body,
  redirect: "follow",
});

const authorizeClient = async () => {
  if (await client.getTokens()) {
    console.log("Already logged in!");
    return;
  }

  if (authorizationInProgress) {
    console.log("Already trying to login!");
    return;
  }
  authorizationInProgress = true;

  const authRequest = await client.authorizationRequest({
    endpoint: `${baseURI}/accounts/authorize`,
    clientId: preferences.clientId,
    scope: "offline_access",
    extraParameters: { clientSecret: preferences.clientSecret },
  });
  const { authorizationCode } = await client.authorize(authRequest);
  const body = new URLSearchParams();
  body.append("redirect_uri", "https://raycast.com/redirect?packageName=Extension");
  body.append("grant_type", "authorization_code");
  body.append("code", authorizationCode);

  await fetch(`${baseURI}/accounts/token`, getRequestOptions(body))
    .then((response) => response.text())
    .then((result) => {
      client.setTokens(<OAuth.TokenResponse>JSON.parse(result));
    })
    .catch((error: Error) => console.error(error));
  if (await client.getTokens()) {
    console.log("Logged in successfully!");
    await getUserData();

    authorizationInProgress = false;

    return await client.getTokens();
  }
};

export const refreshToken = async () => {
  const tokens = await client.getTokens();
  if (!tokens) {
    return await authorizeClient();
  } else {
    if (revalidating) {
      return;
    }
    revalidating = true;
    if (!tokens.refreshToken) {
      confirmAlert({
        title: "Couldn't refresh token",
        message: "To continue using this extension please re-authorize.",
        primaryAction: {
          title: "Authorize",
          style: Alert.ActionStyle.Default,
          onAction: async () => {
            await client.removeTokens();
            await authorizeClient();
          },
        },
      });
      return;
    }
    console.log("Refreshing token...");

    const body = new URLSearchParams();
    body.append("grant_type", "refresh_token");
    body.append("refresh_token", tokens.refreshToken);

    await fetch(`${baseURI}/accounts/token`, getRequestOptions(body))
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.text();
      })
      .then(async (result) => {
        const newTokens = <OAuth.TokenResponse>JSON.parse(result);
        await client.setTokens(newTokens);
      })
      .catch((error: Error) => console.error(error));

    if (tokens.accessToken !== (await client.getTokens())?.accessToken) {
      console.log("Refreshed Token");
      await getUserData();

      revalidating = false;

      return await client.getTokens();
    }
  }
};

const getUserData = async () => {
  if (!(await client.getTokens())) await authorizeClient();
  if ((await client.getTokens())?.isExpired()) await refreshToken();

  let data: User;

  await fetch(`${baseURI}/users/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
    redirect: "follow",
  })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.text();
    })
    .then(async (result) => {
      data = <User>JSON.parse(result);
      await LocalStorage.setItem("userId", data.id);
      await LocalStorage.setItem("URL", data.workspace.url);
    })
    .catch((error: Error) => {
      showFailureToast("Failed to fetch user data", error);
      console.error(error);
    });
};

export const getTokens = async () => {
  if (authorizationInProgress) {
    console.log("Currently authorizing");
    return;
  }
  if (revalidating) {
    console.log("Currently refreshing token");
    return;
  }

  if (!(await client.getTokens())) {
    console.log("Authorize Client");
    return await authorizeClient();
  }
  if ((await client.getTokens())?.isExpired()) {
    console.log("Refresh token");
    await refreshToken();
  }
  return await client.getTokens();
};
