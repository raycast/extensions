import { OAuth } from "@raycast/api";
import { execFileSync } from "node:child_process";
import os from "node:os";

import { getSleevyPreferences } from "./preferences";

const SCOPES = [
  "saved-items:capture",
  "saved-items:read",
  "saved-items:write",
  "account:read",
] as const;

export const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Sleevy",
  providerIcon: "extension-icon.png",
  description: "Connect Raycast to your Sleevy account.",
});

function macComputerName(): string | null {
  if (process.platform !== "darwin") return null;
  try {
    const name = execFileSync("/usr/sbin/scutil", ["--get", "ComputerName"], {
      encoding: "utf8",
      timeout: 1000,
    }).trim();
    return name.length > 0 ? name : null;
  } catch {
    return null;
  }
}

function hostnameFirstSegment(): string | null {
  const cleaned = os
    .hostname()
    .split(".")[0]
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > 0 ? cleaned : null;
}

function platformLabel(): string {
  switch (process.platform) {
    case "darwin":
      return "macOS";
    case "win32":
      return "Windows";
    case "linux":
      return "Linux";
    default:
      return process.platform;
  }
}

export function deviceName(): string {
  return macComputerName() ?? hostnameFirstSegment() ?? platformLabel();
}

function deviceLabel(): string {
  return `Raycast on ${deviceName()}`;
}

export function deriveWebUrl(apiUrl: string): string {
  try {
    const parsed = new URL(apiUrl);
    if (parsed.hostname.startsWith("api.")) {
      return `${parsed.protocol}//${parsed.hostname.slice(4)}`;
    }
    return parsed.origin;
  } catch {
    return "https://sleevy.app";
  }
}

/**
 * Authorizes Raycast against the Sleevy API and returns the access token to
 * use as a Bearer credential. Reuses an existing cached token if present,
 * otherwise drives the PKCE consent flow and exchanges the resulting code
 * for an API key via /connect/exchange.
 */
export const authorize = async (): Promise<string> => {
  const existing = await oauthClient.getTokens();
  if (existing?.accessToken) return existing.accessToken;

  const prefs = getSleevyPreferences();
  const apiUrl = prefs.apiUrl;
  const webUrl = prefs.webUrl || deriveWebUrl(apiUrl);

  const authRequest = await oauthClient.authorizationRequest({
    endpoint: `${webUrl}/connect`,
    clientId: "raycast",
    scope: SCOPES.join(" "),
    extraParameters: {
      client: "raycast",
      device_hint: deviceLabel(),
    },
  });

  const { authorizationCode } = await oauthClient.authorize(authRequest);

  const response = await fetch(`${apiUrl}/connect/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client: "raycast",
      code: authorizationCode,
      codeVerifier: authRequest.codeVerifier,
    }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Exchange failed (HTTP ${response.status}): ${body || "no body"}`,
    );
  }
  const result = (await response.json()) as { apiKey: string };
  await oauthClient.setTokens({ accessToken: result.apiKey });
  return result.apiKey;
};
