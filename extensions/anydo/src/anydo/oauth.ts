import { createHash, randomBytes } from "crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "http";

export const AUTHORIZE_URL = "https://mcp.any.do/authorize";
export const TOKEN_URL = "https://mcp.any.do/token";
export const REGISTER_URL = "https://mcp.any.do/register";
export const SCOPE = "access_anydo_data update_anydo_data";

const CALLBACK_TIMEOUT_MS = 5 * 60 * 1000;

export interface OAuthTokens {
  access_token: string;
  token_type?: string;
  scope?: string;
  expires_in?: number;
  expires_at?: number;
  refresh_token?: string;
  [key: string]: unknown;
}

export interface ClientRegistration {
  client_id: string;
  redirect_uri: string;
}

interface CallbackResult {
  code?: string;
  state?: string;
  error?: string;
  error_description?: string;
}

function base64url(input: Buffer): string {
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function postForm(
  url: string,
  form: Record<string, string>,
): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams(form).toString(),
  });
  const text = await response.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!response.ok) {
    throw new Error(
      `Any.do OAuth request to ${url} failed (HTTP ${response.status}): ${text.slice(0, 300)}`,
    );
  }
  return json as Record<string, unknown>;
}

/** Registers a throwaway public client (RFC 7591) bound to our localhost callback. */
export async function registerClient(
  redirectUri: string,
): Promise<ClientRegistration> {
  const response = await fetch(REGISTER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_name: "Raycast Any.do (local)",
      redirect_uris: [redirectUri],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      scope: SCOPE,
    }),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `Any.do client registration failed (HTTP ${response.status}): ${text.slice(0, 300)}`,
    );
  }
  const json = JSON.parse(text) as { client_id?: string };
  if (!json.client_id) {
    throw new Error(
      `Any.do client registration returned no client_id: ${text.slice(0, 300)}`,
    );
  }
  return { client_id: json.client_id, redirect_uri: redirectUri };
}

function normalizeTokens(json: Record<string, unknown>): OAuthTokens {
  const accessToken = json.access_token;
  if (typeof accessToken !== "string" || accessToken.length === 0) {
    throw new Error(
      `Any.do token endpoint returned no access_token: ${JSON.stringify(json).slice(0, 300)}`,
    );
  }
  const expiresIn =
    typeof json.expires_in === "number" ? json.expires_in : 3600;
  return {
    ...(json as OAuthTokens),
    access_token: accessToken,
    expires_in: expiresIn,
    expires_at: Date.now() + expiresIn * 1000,
  };
}

interface CallbackServer {
  port: number;
  result: Promise<CallbackResult>;
  close: () => void;
}

function startCallbackServer(timeoutMs: number): Promise<CallbackServer> {
  return new Promise((resolve, reject) => {
    let settle: (result: CallbackResult) => void = () => undefined;
    let timer: NodeJS.Timeout | undefined;
    const result = new Promise<CallbackResult>((res) => {
      settle = res;
    });

    const server = createServer(
      (request: IncomingMessage, response: ServerResponse) => {
        const url = new URL(request.url ?? "/", "http://127.0.0.1");
        if (url.pathname !== "/callback") {
          response.writeHead(404, { "Content-Type": "text/plain" });
          response.end("Not found");
          return;
        }
        const params = url.searchParams;
        const error = params.get("error");
        response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        response.end(
          `<!doctype html><html><head><meta charset="utf-8"><title>Any.do</title></head><body style="font-family:system-ui;background:#141414;color:#f5f5f5;display:flex;height:100vh;align-items:center;justify-content:center"><div style="text-align:center"><h2>${
            error ? "Sign-in failed" : "Signed in to Any.do"
          }</h2><p>${error ? "Return to Raycast and try again." : "You can close this tab and go back to Raycast."}</p></div></body></html>`,
        );
        settle({
          code: params.get("code") ?? undefined,
          state: params.get("state") ?? undefined,
          error: error ?? undefined,
          error_description: params.get("error_description") ?? undefined,
        });
      },
    );

    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      if (!port) {
        reject(new Error("Could not start the local OAuth callback listener."));
        return;
      }
      timer = setTimeout(() => settle({ error: "timeout" }), timeoutMs);
      resolve({
        port,
        result,
        close: () => {
          if (timer) clearTimeout(timer);
          server.close();
        },
      });
    });
  });
}

/** Full browser-based authorization-code + PKCE flow. Returns fresh tokens. */
export async function runLoginFlow(): Promise<{
  tokens: OAuthTokens;
  registration: ClientRegistration;
}> {
  const { open } = await import("@raycast/api");
  const server = await startCallbackServer(CALLBACK_TIMEOUT_MS);
  const redirectUri = `http://127.0.0.1:${server.port}/callback`;

  try {
    const registration = await registerClient(redirectUri);
    const verifier = base64url(randomBytes(32));
    const challenge = base64url(createHash("sha256").update(verifier).digest());
    const state = base64url(randomBytes(16));

    const authorizeUrl = new URL(AUTHORIZE_URL);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("client_id", registration.client_id);
    authorizeUrl.searchParams.set("redirect_uri", redirectUri);
    authorizeUrl.searchParams.set("scope", SCOPE);
    authorizeUrl.searchParams.set("state", state);
    authorizeUrl.searchParams.set("code_challenge", challenge);
    authorizeUrl.searchParams.set("code_challenge_method", "S256");

    await open(authorizeUrl.toString());

    const callback = await server.result;
    if (callback.error) {
      throw new Error(
        callback.error === "timeout"
          ? "Timed out waiting for the browser to finish the Any.do sign-in."
          : `Any.do sign-in failed: ${callback.error}${callback.error_description ? ` (${callback.error_description})` : ""}`,
      );
    }
    if (callback.state !== state) {
      throw new Error(
        "Any.do sign-in failed: the returned OAuth state does not match the request.",
      );
    }
    if (!callback.code) {
      throw new Error(
        "Any.do sign-in failed: no authorization code was returned.",
      );
    }

    const json = await postForm(TOKEN_URL, {
      grant_type: "authorization_code",
      code: callback.code,
      redirect_uri: redirectUri,
      client_id: registration.client_id,
      code_verifier: verifier,
    });
    return { tokens: normalizeTokens(json), registration };
  } finally {
    server.close();
  }
}

export async function refreshTokens(
  clientId: string,
  refreshToken: string,
): Promise<OAuthTokens> {
  const json = await postForm(TOKEN_URL, {
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
  });
  return normalizeTokens(json);
}
