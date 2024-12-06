import { LocalStorage, OAuth, open } from "@raycast/api";
import { createDeeplink } from "@raycast/utils";
import fetch from "node-fetch";

const clientId = "52085970";
export const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "VK",
  providerIcon: "vk-oauth.png",
  providerId: "vk",
  description: "Авторизация в vk.com",
});

export async function authorize() {
  const deeplink = await createDeeplink({
    command: "auth",
  });

  console.log("deeplink", deeplink);

  const authRequest = await client.authorizationRequest({
    scope: "email",
    endpoint: "https://id.vk.com/authorize",
    clientId,
    extraParameters: { redirect_uri: "https://raycast.com/redirect/extension" },
  });

  const url = new URL("https://telegram-calls.dimensi.dev/raycast/start");
  url.searchParams.set("id", authRequest.state);
  url.searchParams.set("deep_link", deeplink);
  const authId = await fetch(url.toString())
    .then((res) => res.json())
    .then((data) => {
      if (typeof data === "object" && data !== null && "id" in data && typeof data.id === "string") {
        return data.id;
      }
      throw new Error("No auth url");
    });

  const redirectUrl = new URL("https://id.vk.com/authorize");
  const query = redirectUrl.searchParams;
  query.append("response_type", "code");
  query.append("client_id", clientId);
  query.append("redirect_uri", `https://telegram-calls.dimensi.dev/raycast/verify`);
  query.append("scope", "email phone");
  query.append("state", authId);
  query.append("code_challenge", authRequest.codeChallenge);
  query.append("code_challenge_method", "s256");

  LocalStorage.setItem("auth_id", authId);
  LocalStorage.setItem("code_verifier", authRequest.codeVerifier);
  await open(redirectUrl.toString());
}

export async function refreshTokens(): Promise<OAuth.TokenSetOptions> {
  const tokenSet = await client.getTokens();
  if (!tokenSet?.refreshToken) {
    throw new Error("No refresh token");
  }

  const deviceId = await LocalStorage.getItem("vk_device_id");
  if (!deviceId) {
    throw new Error("No device id");
  }

  const params = new URLSearchParams();
  params.set("grant_type", "refresh_token");
  params.set("refresh_token", tokenSet.refreshToken);
  params.set("client_id", clientId);
  params.set("device_id", deviceId.toString());
  params.set("state", Math.random().toString(36).substring(7));

  const response = await fetch("https://id.vk.com/oauth2/auth", {
    method: "POST",
    body: params,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  if (!response.ok) {
    console.error("refresh tokens error:", await response.text());
    throw new Error(response.statusText);
  }

  const data = (await response.json()) as AuthFetchTokensResponse;

  // Сохраняем новый device_id если он изменился
  if (data.device_id !== deviceId) {
    await LocalStorage.setItem("vk_device_id", data.device_id);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

export const createTokens = async (tokenSet: { device_id: string; code: string }) => {
  const params = new URLSearchParams();
  params.set("grant_type", "authorization_code");
  params.set("code", tokenSet.code);
  params.set("client_id", clientId);
  params.set("device_id", tokenSet.device_id);
  params.set("code_verifier", (await LocalStorage.getItem("code_verifier")) || "");
  params.set("redirect_uri", "https://telegram-calls.dimensi.dev/raycast/verify");

  const response = await fetch("https://id.vk.com/oauth2/auth", {
    method: "POST",
    body: params,
  });

  const data = (await response.json()) as AuthFetchTokensResponse;

  await LocalStorage.setItem("vk_user_id", data.user_id.toString());
  await LocalStorage.setItem("vk_device_id", tokenSet.device_id);
  await client.setTokens({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  });
  return data;
};

export interface AuthFetchTokensResponse {
  refresh_token: string;
  access_token: string;
  id_token: string;
  token_type: string;
  expires_in: number;
  user_id: number;
  state: string;
  scope: string;
  device_id: string;
}
