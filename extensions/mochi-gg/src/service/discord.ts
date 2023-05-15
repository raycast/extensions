import { Cache, OAuth } from "@raycast/api";
import axios from "axios";

const cache = new Cache();

const clientId = "1098132734129479710";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Discord",
  providerIcon: "discord-mark-blue.png",
  providerId: "discord",
  description: "Connect your Discord account\n(Mochi Raycast Extension)",
});

// Authorization
export async function authorize(): Promise<void> {
  const tokenSet = await client.getTokens();
  if (tokenSet?.accessToken) {
    if (tokenSet.refreshToken && tokenSet.isExpired()) {
      await client.setTokens(await refreshTokens(tokenSet.refreshToken));
    }
    return;
  }

  const authRequest = await client.authorizationRequest({
    endpoint: "https://discord.com/api/oauth2/authorize",
    clientId: clientId,
    scope: "identify",
    extraParameters: { response_type: "code" },
  });

  const { authorizationCode } = await client.authorize(authRequest);
  await client.setTokens(await fetchTokens(authRequest, authorizationCode));
}

export async function fetchTokens(
  authRequest: OAuth.AuthorizationRequest,
  authCode: string
): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("code", authCode);
  params.append("code_verifier", authRequest.codeVerifier);
  params.append("grant_type", "authorization_code");
  params.append("redirect_uri", authRequest.redirectURI);

  const { data } = await axios.post("https://discord.com/api/oauth2/token", params);

  return data as OAuth.TokenResponse;
}

export async function logout() {
  cache.remove("current_user");
  return client.removeTokens();
}

async function refreshTokens(refreshToken: string): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("refresh_token", refreshToken);
  params.append("grant_type", "refresh_token");

  const { data: tokenResponse } = await axios.post("https://discord.com/api/oauth2/token", params);

  tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;
  return tokenResponse;
}

// API
export interface IDiscordUser {
  id: string;
  username: string;
  avatar: string;
}
export async function fetchUser(): Promise<IDiscordUser> {
  const dt = cache.get("current_user");
  if (dt) {
    return JSON.parse(dt.toString());
  }

  const { data } = await axios.get("https://discord.com/api/users/@me", {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
  });

  cache.set("current_user", JSON.stringify(data));

  return data;
}

export function subscribeOnUserChange(callback: (user?: IDiscordUser) => void) {
  const unsubscribe = cache.subscribe((key: string | undefined, data: string | undefined) => {
    if (key === "current_user") {
      if (data) {
        const user = JSON.parse(data);
        callback(user as IDiscordUser);
      } else {
        callback(undefined);
      }
    }
  });

  return unsubscribe;
}
