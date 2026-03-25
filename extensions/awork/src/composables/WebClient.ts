import { Alert, confirmAlert, getPreferenceValues, LocalStorage, OAuth } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { fetchWithTimeout } from "./HttpClient";

interface workspace {
  id: string;
  name: string;
  url: string;
}

interface User {
  id: string;
  workspace: workspace;
}

interface TokenOptions {
  allowUserInteraction?: boolean;
}

export const baseURI = "https://api.awork.com/api/v1";

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

const showReauthorizeAlert = async () => {
  await confirmAlert({
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
};

const authorizeClient = async () => {
  if (await client.getTokens()) {
    console.log("Already logged in!");
    return await client.getTokens();
  }

  const authRequest = await client.authorizationRequest({
    endpoint: `${baseURI}/accounts/authorize`,
    clientId: preferences.clientId,
    scope: "offline_access",
    extraParameters: { clientSecret: preferences.clientSecret },
  });
  const { authorizationCode } = await client.authorize(authRequest);
  const body = new URLSearchParams();
  body.append("redirect_uri", authRequest.redirectURI);
  body.append("grant_type", "authorization_code");
  body.append("code", authorizationCode);
  body.append("code_verifier", authRequest.codeVerifier);

  await fetchWithTimeout(`${baseURI}/accounts/token`, getRequestOptions(body))
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Unable to authorize: ${response.status} ${response.statusText}, ${await response.text()}`);
      } else {
        return await response.text();
      }
    })
    .then(async (result) => {
      const newTokens = <OAuth.TokenResponse>JSON.parse(result);
      try {
        await client.setTokens(newTokens);
      } catch {
        confirmAlert({
          title: "Something went wrong",
          message: "Please try again.",
          primaryAction: {
            title: "Ok",
            style: Alert.ActionStyle.Default,
          },
        });
      }
    })
    .catch((error: Error) => console.error(error));
  if (await client.getTokens()) {
    console.log("Logged in successfully!");
    await getUserData();

    return await client.getTokens();
  }
};

export const refreshToken = async (options: TokenOptions = {}) => {
  const { allowUserInteraction = true } = options;
  const tokens = await client.getTokens();

  if (!tokens) {
    if (!allowUserInteraction) {
      return undefined;
    }
    return await authorizeClient();
  }

  if (!tokens.refreshToken) {
    if (!allowUserInteraction) {
      return undefined;
    }
    await showReauthorizeAlert();
    return undefined;
  }

  console.log("Refreshing token...");

  const body = new URLSearchParams();
  body.append("grant_type", "refresh_token");
  body.append("refresh_token", tokens.refreshToken);

  try {
    const response = await fetchWithTimeout(`${baseURI}/accounts/token`, getRequestOptions(body));
    if (!response.ok) {
      if (allowUserInteraction) {
        await showReauthorizeAlert();
        return undefined;
      }
      throw new Error(`Unable to refresh token: ${response.status} ${response.statusText}`);
    }

    const result = await response.text();
    const newTokens = <OAuth.TokenResponse>JSON.parse(result);
    await client.setTokens(newTokens);
  } catch (error) {
    if (allowUserInteraction) {
      await showReauthorizeAlert();
    }
    console.error(error);
    return undefined;
  }

  if (tokens.accessToken !== (await client.getTokens())?.accessToken) {
    console.log("Refreshed Token");
    await getUserData();
  }

  return await client.getTokens();
};

const getUserData = async () => {
  if (!(await client.getTokens())) await authorizeClient();
  if ((await client.getTokens())?.isExpired()) await refreshToken({ allowUserInteraction: true });

  let data: User;

  await fetchWithTimeout(`${baseURI}/users/me`, {
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

export const getTokens = async (options: TokenOptions = {}) => {
  const { allowUserInteraction = true } = options;
  const tokens = await client.getTokens();

  if (!tokens) {
    if (!allowUserInteraction) {
      return undefined;
    }
    console.log("Authorize Client");
    return await authorizeClient();
  } else if (tokens.isExpired()) {
    console.log("Refresh token");
    return await refreshToken({ allowUserInteraction });
  } else {
    return tokens;
  }
};
