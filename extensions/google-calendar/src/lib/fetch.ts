import nodeFetch, { RequestInit } from "node-fetch";
import { loginGoogle, refreshTokens } from "./auth";
import { client } from "./client";

const authorize = async () => {
  const tokens = await client.getTokens();

  if (tokens?.accessToken) {
    if (tokens?.refreshToken && tokens.isExpired()) {
      const newTokens = await refreshTokens(tokens.refreshToken);
      await client.setTokens(newTokens);
    }
    return;
  }

  await loginGoogle();
};

export const fetch = async (url: string, options: RequestInit = {}) => {
  await authorize();
  const newTokens = await client.getTokens();

  const headers = {
    Authorization: `Bearer ${newTokens?.accessToken}`,
  };

  return nodeFetch(url, { ...options, headers });
};
