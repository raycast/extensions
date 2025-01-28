import { OAuth } from "@raycast/api";
import fetch from "node-fetch";

const clientId = "1333206472959594598";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Discord",
  providerIcon: "extension-icon.png",
  providerId: "discord",
  description: "Connect your Discord account",
});

// Autorização

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
    scope: "guilds guilds.members.read identify",
    extraParameters: {
      redirect_uri: "https://raycast.com/redirect/extension",
    },
  });
  const { authorizationCode } = await client.authorize(authRequest);
  await client.setTokens(await fetchTokens(authRequest, authorizationCode));
}

async function fetchTokens(authRequest: OAuth.AuthorizationRequest, authCode: string): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("code", authCode);
  params.append("code_verifier", authRequest.codeVerifier);
  params.append("grant_type", "authorization_code");
  params.append("redirect_uri", "https://raycast.com/redirect/extension");

  const response = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    body: params,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  if (!response.ok) {
    console.error("Erro ao buscar tokens:", await response.text());
    throw new Error(response.statusText);
  }
  return (await response.json()) as OAuth.TokenResponse;
}

async function refreshTokens(refreshToken: string): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("refresh_token", refreshToken);
  params.append("grant_type", "refresh_token");

  const response = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    body: params,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  if (!response.ok) {
    console.error("Erro ao atualizar tokens:", await response.text());
    throw new Error(response.statusText);
  }
  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;
  return tokenResponse;
}

export async function fetchServers(): Promise<{ id: string; name: string; icon: string }[]> {
  const response = await fetch("https://discord.com/api/users/@me/guilds", {
    headers: {
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
  });
  if (!response.ok) {
    console.error("Erro ao buscar servidores:", await response.text());
    throw new Error(response.statusText);
  }
  const raw = await response.json();

  const guilds = raw as { id: string; name: string; icon: string }[];
  return guilds.map((guild) => ({
    id: guild.id,
    name: guild.name,
    icon: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : "",
  }));
}
