/* eslint-disable @typescript-eslint/no-explicit-any */
import { OAuth, AI } from "@raycast/api";
import fetch from "node-fetch";

import { Prompt } from "./data/prompts";

export const API_HOST = "https://www.raycast.com";

const clientId = "MdUGTp0f1A2Dt6K-dwn9z_2HcUXDWQPBLFXeV7V87u4";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.AppURI,
  providerName: "Raycast",
  providerIcon: "extension-icon.png",
  description: "Connect your Raycast account",
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
    endpoint: `${API_HOST}/oauth/authorize`,
    clientId: clientId,
    scope: "read write",
  });
  const { authorizationCode } = await client.authorize(authRequest);
  await client.setTokens(await fetchTokens(authRequest, authorizationCode));
}

async function fetchTokens(authRequest: OAuth.AuthorizationRequest, authCode: string): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("code", authCode);
  params.append("code_verifier", authRequest.codeVerifier);
  params.append("verifier", authRequest.codeVerifier);
  params.append("grant_type", "authorization_code");
  params.append("redirect_uri", authRequest.redirectURI);

  const response = await fetch(`${API_HOST}/oauth/token`, { method: "POST", body: params });
  if (!response.ok) {
    console.error("fetch tokens error:", await response.text());
    throw new Error(response.statusText);
  }
  return (await response.json()) as OAuth.TokenResponse;
}

async function refreshTokens(refreshToken: string): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("refresh_token", refreshToken);
  params.append("grant_type", "refresh_token");

  const response = await fetch(`${API_HOST}/oauth/token`, { method: "POST", body: params });
  if (!response.ok) {
    console.error("refresh tokens error:", await response.text());
    throw new Error(response.statusText);
  }
  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;
  return tokenResponse;
}

export async function getAccessToken() {
  const tokenSet = await client.getTokens();
  return tokenSet?.accessToken;
}

// API

export async function getPromptUpvotes() {
  const accessToken = await getAccessToken();

  const response = await fetch(
    `${API_HOST}/api/v1/prompts`,
    accessToken
      ? {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
        }
      : undefined,
  );

  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  return response.json() as Promise<{ data: { id: string; upvoted: boolean; upvote_count: number }[] }>;
}

export async function upvote(prompt: Prompt): Promise<any> {
  await authorize();

  const accessToken = await getAccessToken();

  const response = await fetch(`${API_HOST}/api/v1/prompts/${prompt.id}/prompt_upvotes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }
}

export async function removeUpvote(prompt: Prompt): Promise<any> {
  await authorize();

  const accessToken = await getAccessToken();

  const response = await fetch(`${API_HOST}/api/v1/prompts/${prompt.id}/prompt_upvotes`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }
}

export type AiModel = {
  id: string;
  name: string;
  description: string;
  availability: "public" | "beta" | "internal" | "deprecated";
  features: string[];
  suggestions: string[];
  capabilities: Record<string, string>;
  in_better_ai_subscription: boolean;
  model: AI.Model;
  provider: string;
  provider_name: string;
  provider_brand: string;
  speed: number;
  intelligence: number;
  requires_better_ai: boolean;
  context: number;
};

export async function getAvailableAiModels() {
  const res = await fetch("https://raycast.com/api/v1/ai/models");
  const models = (await res.json()) as { models: AiModel[] };
  return models.models as AiModel[];
}
