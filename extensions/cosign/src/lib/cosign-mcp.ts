import { logger } from "@chrismessina/raycast-logger";
import { LocalStorage, OAuth } from "@raycast/api";

const ISSUER = "https://api.cosign.co";
const MCP_URL = `${ISSUER}/mcp`;
const SCOPE = "member:read member:write";
const CLIENT_KEY = "cosign.oauth-client";
// Scope the stored tokens were granted under. A mismatch (older read-only token) forces one re-consent.
const TOKEN_SCOPE_KEY = "cosign.token-scope";

const log = logger.child("[Cosign]");

/** fetch with a verbose-only request/response trace. Logs method, URL, a short label, status and timing — never headers or bodies. */
async function tracedFetch(url: string, init: RequestInit, label: string): Promise<Response> {
  const method = init.method ?? "GET";
  const started = Date.now();
  log.log(`→ ${method} ${url} (${label})`);
  try {
    const res = await fetch(url, init);
    const ms = Date.now() - started;
    const retryAfter = res.headers.get("retry-after");
    log.log(`← ${res.status} ${method} ${url} (${label}) ${ms}ms${retryAfter ? ` retry-after=${retryAfter}` : ""}`);
    return res;
  } catch (error) {
    log.error(`✗ ${method} ${url} (${label}) ${Date.now() - started}ms`, error);
    throw error;
  }
}

const oauth = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Cosign",
  providerIcon: "extension-icon.png",
  providerId: "cosign",
  description: "Connect your Cosign account. Write access is used only to keep your favorites in private Cosign lists.",
});

interface StoredClient {
  clientId: string;
  redirectURI: string;
  scope?: string;
}

async function registerClient(redirectURI: string): Promise<string> {
  const cached = await LocalStorage.getItem<string>(CLIENT_KEY);
  if (cached) {
    const stored = JSON.parse(cached) as StoredClient;
    if (stored.redirectURI === redirectURI && stored.scope === SCOPE) return stored.clientId;
  }
  const res = await tracedFetch(
    `${ISSUER}/register`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        client_name: "Raycast",
        redirect_uris: [redirectURI],
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
        scope: SCOPE,
      }),
    },
    "register client",
  );
  if (!res.ok) throw new Error(`Cosign client registration failed (${res.status}): ${await res.text()}`);
  const { client_id } = (await res.json()) as { client_id: string };
  await LocalStorage.setItem(
    CLIENT_KEY,
    JSON.stringify({ clientId: client_id, redirectURI, scope: SCOPE } satisfies StoredClient),
  );
  return client_id;
}

async function tokenRequest(params: Record<string, string>): Promise<OAuth.TokenResponse> {
  const res = await tracedFetch(
    `${ISSUER}/token`,
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ ...params, resource: MCP_URL }),
    },
    params.grant_type,
  );
  if (!res.ok) throw new Error(`Cosign token request failed (${res.status}): ${await res.text()}`);
  return (await res.json()) as OAuth.TokenResponse;
}

async function authorize(): Promise<string> {
  // The Web redirect URI is only known from an authorization request, but the client ID must be
  // registered against it. Build a throwaway request to learn the URI, then the real one.
  const probe = await oauth.authorizationRequest({
    endpoint: `${ISSUER}/authorize`,
    clientId: "pending",
    scope: SCOPE,
  });
  const clientId = await registerClient(probe.redirectURI);

  const request = await oauth.authorizationRequest({
    endpoint: `${ISSUER}/authorize`,
    clientId,
    scope: SCOPE,
    extraParameters: { resource: MCP_URL },
  });
  const { authorizationCode } = await oauth.authorize(request);
  const tokens = await tokenRequest({
    grant_type: "authorization_code",
    code: authorizationCode,
    redirect_uri: request.redirectURI,
    client_id: clientId,
    code_verifier: request.codeVerifier,
  });
  await oauth.setTokens(tokens);
  await LocalStorage.setItem(TOKEN_SCOPE_KEY, SCOPE);
  return tokens.access_token;
}

async function refresh(refreshToken: string): Promise<string | undefined> {
  const cached = await LocalStorage.getItem<string>(CLIENT_KEY);
  if (!cached) return undefined;
  try {
    const tokens = await tokenRequest({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: (JSON.parse(cached) as StoredClient).clientId,
    });
    await oauth.setTokens({ ...tokens, refresh_token: tokens.refresh_token ?? refreshToken });
    return tokens.access_token;
  } catch {
    return undefined;
  }
}

async function getAccessToken(): Promise<string> {
  const stored = await oauth.getTokens();
  if (stored && (await LocalStorage.getItem<string>(TOKEN_SCOPE_KEY)) !== SCOPE) {
    await oauth.removeTokens();
    return authorize();
  }
  if (stored?.accessToken && !stored.isExpired()) return stored.accessToken;
  if (stored?.refreshToken) {
    const refreshed = await refresh(stored.refreshToken);
    if (refreshed) return refreshed;
  }
  return authorize();
}

interface JsonRpcResponse<T> {
  result?: T;
  error?: { code: number; message: string };
}

async function rpc<T>(
  token: string,
  body: object,
  sessionId?: string,
): Promise<{ data?: JsonRpcResponse<T>; sessionId?: string; status: number; retryAfter?: string | null }> {
  const { method, params } = body as {
    method: string;
    params?: { name?: string; arguments?: Record<string, unknown> };
  };
  // key=value, not JSON: the logger masks the values of `...Id` keys in JSON, which hides exactly what a trace needs.
  const traceArgs = Object.entries(params?.arguments ?? {})
    .filter(([k]) => k !== "reason_for_call" && k !== "llm_model")
    .map(([k, v]) => `${k}=${typeof v === "string" && /^\S+$/.test(v) ? v : JSON.stringify(v)}`)
    .join(" ");
  const res = await tracedFetch(
    MCP_URL,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        authorization: `Bearer ${token}`,
        ...(sessionId ? { "mcp-session-id": sessionId } : {}),
      },
      body: JSON.stringify(body),
    },
    params?.name ? `${method} ${params.name} ${traceArgs}` : method,
  );
  const newSession = res.headers.get("mcp-session-id") ?? sessionId;
  if (res.status === 202) return { status: 202, sessionId: newSession };
  const text = await res.text();
  if (!res.ok) {
    return { status: res.status, sessionId: newSession, retryAfter: res.headers.get("retry-after"), data: undefined };
  }
  if ((res.headers.get("content-type") ?? "").includes("text/event-stream")) {
    // Take the event that answers this request, not a notification that arrived before it.
    const events = text
      .split("\n")
      .filter((l) => l.startsWith("data:"))
      .map((l) => JSON.parse(l.slice(5)) as JsonRpcResponse<T> & { id?: number });
    const answer = events.find((e) => e.id === (body as { id?: number }).id) ?? events[0];
    return { status: res.status, sessionId: newSession, data: answer };
  }
  return { status: res.status, sessionId: newSession, data: JSON.parse(text) };
}

interface Session {
  token: string;
  sessionId?: string;
}

const INIT = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "raycast-cosign", version: "0.1.0" },
  },
};

async function openSession(): Promise<Session> {
  let token = await getAccessToken();
  let init = await rpc(token, INIT);
  if (init.status === 401) {
    await oauth.removeTokens();
    token = await authorize();
    init = await rpc(token, INIT);
  }
  if (init.status === 429) throw new Error(`Cosign rate limit reached. Retry after ${init.retryAfter ?? "a moment"}.`);
  if (init.status !== 200) throw new Error(`Cosign MCP initialize failed (${init.status}).`);
  await rpc(token, { jsonrpc: "2.0", method: "notifications/initialized" }, init.sessionId);
  return { token, sessionId: init.sessionId };
}

// One initialized session per command process, so a detail fetch costs one round trip, not three.
let session: Promise<Session> | undefined;

function getSession(): Promise<Session> {
  session ??= openSession().catch((error) => {
    session = undefined;
    throw error;
  });
  return session;
}

type ToolResult = { isError?: boolean; content: { type: string; text?: string }[] };

export async function callTool<T>(name: string, args: Record<string, unknown>, retried = false): Promise<T> {
  const used = getSession();
  const { token, sessionId } = await used;
  const call = await rpc<ToolResult>(
    token,
    { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name, arguments: { llm_model: "unknown", ...args } } },
    sessionId,
  );
  if (call.status === 429) throw new Error(`Cosign rate limit reached. Retry after ${call.retryAfter ?? "a moment"}.`);
  if ((call.status === 401 || call.status === 404) && !retried) {
    // Expired token or dropped session: reopen once. Only drop the session this call used, so concurrent
    // failures share one replacement (and one sign-in) instead of each starting their own.
    if (session === used) session = undefined;
    return callTool<T>(name, args, true);
  }
  // Any other HTTP failure (including a retry that failed again) must not read as an empty success.
  if (call.status >= 400) throw new Error(`Cosign request failed (HTTP ${call.status}).`);
  if (call.data?.error) throw new Error(call.data.error.message);
  const result = call.data?.result;
  const text = result?.content.find((c) => c.type === "text")?.text ?? "";
  if (result?.isError) throw new Error(text || "Cosign tool call failed.");
  // Write tools such as add_list_item answer with a literal null or nothing at all.
  return (text ? JSON.parse(text) : null) as T;
}

export async function signOut(): Promise<void> {
  session = undefined;
  await oauth.removeTokens();
  await LocalStorage.removeItem(TOKEN_SCOPE_KEY);
}
