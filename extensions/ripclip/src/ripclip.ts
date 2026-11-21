// CLAUDE 11-19 (AI-app listings session): sign-in and the REST calls every command shares.
// RipClip's OAuth (docs/API.md "OAuth bearer access"): public client, PKCE S256, tokens for the REST API resource only.
// The client is Raycast's own published identity (CIMD), so RipClip's consent page names Raycast and nothing is
// registered per install. No API key, no secret in the extension.
import { OAuth } from "@raycast/api";
import { randomUUID } from "node:crypto";

export const SITE = "https://ripclip.org";
const API = `${SITE}/api/v1`;
const CLIENT_ID = "https://www.raycast.com/.well-known/oauth-client-metadata/raycast.json";
const SCOPE = "read import"; // never "generate": nothing here spends Horizon Units

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.ClientIdMetadataDocument,
  providerName: "RipClip",
  providerIcon: "icon.png",
  providerId: "ripclip",
  description: "Connect your RipClip account to import videos and see your clips.",
});

type Tokens = { access_token: string; refresh_token?: string; expires_in?: number; scope?: string };

async function token(body: Record<string, string>): Promise<Tokens> {
  const r = await fetch(`${SITE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: CLIENT_ID, resource: API, ...body }).toString(),
  });
  const data = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  if (!r.ok) throw new Error(String(data.error_description || data.message || `RipClip sign-in failed (${r.status})`));
  return data as Tokens;
}

async function signIn(): Promise<string> {
  const request = await client.authorizationRequest({
    endpoint: `${SITE}/oauth/authorize`,
    clientId: CLIENT_ID,
    scope: SCOPE,
    extraParameters: { resource: API },
  });
  const { authorizationCode } = await client.authorize(request);
  const tokens = await token({
    grant_type: "authorization_code",
    code: authorizationCode,
    code_verifier: request.codeVerifier,
    redirect_uri: request.redirectURI,
  });
  await client.setTokens(tokens);
  return tokens.access_token;
}

async function accessToken(): Promise<string> {
  const set = await client.getTokens();
  if (set?.accessToken && !set.isExpired()) return set.accessToken;
  if (set?.refreshToken) {
    try {
      const fresh = await token({ grant_type: "refresh_token", refresh_token: set.refreshToken });
      await client.setTokens(fresh);
      return fresh.access_token;
    } catch {
      await client.removeTokens(); // revoked or expired: sign in again
    }
  }
  return signIn();
}

export async function api<T>(path: string, body?: object): Promise<T> {
  const r = await fetch(API + path, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      ...(body ? { "Content-Type": "application/json", "Idempotency-Key": randomUUID() } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await r.json().catch(() => ({}))) as { error?: { message?: string }; detail?: unknown };
  if (r.status === 401) await client.removeTokens();
  if (!r.ok) {
    const detail = typeof data.detail === "string" ? data.detail : "";
    throw new Error(data.error?.message || detail || `RipClip answered ${r.status}`);
  }
  return data as T;
}

export type Job = { job_id: string; status: string; name: string; project_id: string | null; created_at: number };
export type Clip = {
  clip_id: string;
  title: string;
  duration_seconds: number;
  download_url: string;
  editor_url: string;
};
export type Project = { project_id: string; name: string; updated_at: number };

export const editorUrl = (projectId: string) => `${SITE}/#project/${projectId}`;
