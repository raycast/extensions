/**
 * MCP transport + OAuth for the official Sunsama MCP server.
 *
 * Auth pattern (the one that works in Raycast): the MCP SDK's auth machinery
 * drives discovery, Dynamic Client Registration, PKCE, resource binding, and
 * token refresh via an OAuthClientProvider; only the browser hop is delegated
 * to Raycast's OAuth.PKCEClient (`authorize({ url })`). Raycast requires a
 * `state` param in the authorize URL, hence `state()`.
 */
import { LocalStorage, OAuth } from "@raycast/api";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { UnauthorizedError } from "@modelcontextprotocol/sdk/client/auth.js";
import type { OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import type {
  OAuthClientInformationMixed,
  OAuthClientMetadata,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import { AuthRequiredError, RateLimitError } from "./errors";

const MCP_URL = "https://api.sunsama.com/mcp";
const REDIRECT_URL = "https://raycast.com/redirect?packageName=Extension";
const CLIENT_INFO_KEY = "sunsama-mcp-client-info";
const CODE_VERIFIER_KEY = "sunsama-mcp-code-verifier";

const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Sunsama",
  providerIcon: "extension-icon.png",
  providerId: "sunsama",
  description: "Connect your Sunsama account to Raycast.",
});

class RaycastOAuthProvider implements OAuthClientProvider {
  /** Resolves with the authorization code once the user finishes the browser hop. */
  private authCode: Promise<string> | null = null;
  /**
   * One interactive sign-in per command run. Without this the SDK re-enters
   * authorization on the retry connect and the user gets a second browser hop
   * for a flow they already completed.
   */
  private prompted = false;

  get redirectUrl(): string {
    return REDIRECT_URL;
  }

  get clientMetadata(): OAuthClientMetadata {
    return {
      client_name: "Raycast Sunsama",
      redirect_uris: [REDIRECT_URL],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      scope: "read execute offline_access",
    };
  }

  state(): string {
    // Raycast rejects authorize URLs without a state param.
    return crypto.randomUUID();
  }

  async clientInformation(): Promise<OAuthClientInformationMixed | undefined> {
    const raw = await LocalStorage.getItem<string>(CLIENT_INFO_KEY);
    return raw ? (JSON.parse(raw) as OAuthClientInformationMixed) : undefined;
  }

  async saveClientInformation(
    info: OAuthClientInformationMixed,
  ): Promise<void> {
    await LocalStorage.setItem(CLIENT_INFO_KEY, JSON.stringify(info));
  }

  async tokens(): Promise<OAuthTokens | undefined> {
    const set = await oauthClient.getTokens();
    if (!set?.accessToken) return undefined;
    return {
      access_token: set.accessToken,
      token_type: "Bearer",
      refresh_token: set.refreshToken,
      scope: set.scope,
    };
  }

  async saveTokens(tokens: OAuthTokens): Promise<void> {
    await oauthClient.setTokens({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      scope: tokens.scope,
    });
  }

  async redirectToAuthorization(authorizationUrl: URL): Promise<void> {
    if (this.prompted) throw new AuthRequiredError();
    this.prompted = true;

    // Rebuild the SDK's authorize URL as a native Raycast authorization
    // request — passing a pre-built URL to `authorize({ url })` fails with
    // "No OAuth session found", because Raycast only registers a session for
    // requests it created itself. Raycast generates its own PKCE pair and
    // state; carry over every non-standard param the SDK added (notably the
    // `resource` binding, which the token exchange depends on).
    const params = authorizationUrl.searchParams;
    const standard = new Set([
      "response_type",
      "client_id",
      "redirect_uri",
      "scope",
      "state",
      "code_challenge",
      "code_challenge_method",
    ]);
    const extraParameters: Record<string, string> = {};
    for (const [key, value] of params) {
      if (!standard.has(key)) extraParameters[key] = value;
    }
    const request = await oauthClient.authorizationRequest({
      endpoint: `${authorizationUrl.origin}${authorizationUrl.pathname}`,
      clientId: params.get("client_id") ?? "",
      scope: params.get("scope") ?? "read execute offline_access",
      extraParameters,
    });
    // The token exchange must use Raycast's verifier, not the one the SDK
    // generated for the URL we discarded.
    await this.saveCodeVerifier(request.codeVerifier);
    // Kick off the browser hop. The code is consumed via takeAuthCode() after
    // the transport surfaces UnauthorizedError; the rejection is handled there,
    // so swallow it here only to avoid an unhandled rejection warning.
    this.authCode = oauthClient
      .authorize(request)
      .then((r) => r.authorizationCode);
    await this.authCode.catch(() => undefined);
  }

  takeAuthCode(): Promise<string> | null {
    const code = this.authCode;
    this.authCode = null;
    return code;
  }

  async saveCodeVerifier(codeVerifier: string): Promise<void> {
    await LocalStorage.setItem(CODE_VERIFIER_KEY, codeVerifier);
  }

  async codeVerifier(): Promise<string> {
    const raw = await LocalStorage.getItem<string>(CODE_VERIFIER_KEY);
    if (!raw) throw new AuthRequiredError();
    return raw;
  }

  async invalidateCredentials(
    scope: "all" | "client" | "tokens" | "verifier",
  ): Promise<void> {
    if (scope === "all" || scope === "tokens") await oauthClient.removeTokens();
    if (scope === "all" || scope === "client")
      await LocalStorage.removeItem(CLIENT_INFO_KEY);
    if (scope === "all" || scope === "verifier")
      await LocalStorage.removeItem(CODE_VERIFIER_KEY);
  }
}

let clientPromise: Promise<Client> | null = null;

async function connect(): Promise<Client> {
  const provider = new RaycastOAuthProvider();
  // First attempt uses stored tokens (refreshing if needed); on Unauthorized
  // the SDK has already sent the user through the browser via the provider, so
  // finish the code exchange and connect once more.
  for (let attempt = 0; ; attempt++) {
    const client = new Client({ name: "raycast-sunsama", version: "1.0.0" });
    const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), {
      authProvider: provider,
    });
    try {
      await client.connect(transport);
      return client;
    } catch (error) {
      const pending = provider.takeAuthCode();
      if (error instanceof UnauthorizedError && pending && attempt === 0) {
        // The user just completed (or dismissed) the browser hop. A dismissal
        // rejects `pending`, which means sign-in didn't happen — surface that
        // as an auth error rather than the raw Raycast rejection.
        let code: string;
        try {
          code = await pending;
        } catch {
          throw new AuthRequiredError();
        }
        await transport.finishAuth(code);
        continue;
      }
      if (error instanceof UnauthorizedError) throw new AuthRequiredError();
      throw error;
    }
  }
}

async function getClient(): Promise<Client> {
  if (!clientPromise) {
    clientPromise = connect().catch((error) => {
      clientPromise = null; // don't cache a failed connection
      throw error;
    });
  }
  return clientPromise;
}

function mapError(error: unknown): never {
  const text = error instanceof Error ? error.message : String(error);
  if (error instanceof UnauthorizedError || /401|unauthorized/i.test(text)) {
    throw new AuthRequiredError();
  }
  if (/429|too many requests/i.test(text)) throw new RateLimitError();
  throw error;
}

/**
 * Parse a server payload as JSON. The MCP server answers in JSON, but an
 * unexpected plain-text reply would otherwise surface as a bare SyntaxError
 * with no hint of where it came from.
 */
function parseJson<T>(text: string, source: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    const preview = text.trim().slice(0, 200);
    throw new Error(
      preview
        ? `Unexpected response from Sunsama (${source}): ${preview}`
        : `Empty response from Sunsama (${source})`,
    );
  }
}

/** Call an MCP tool; returns the text content (usually JSON) of the result. */
export async function callTool(
  name: string,
  args: Record<string, unknown> = {},
): Promise<string> {
  const client = await getClient();
  let result;
  try {
    result = await client.callTool({ name, arguments: args });
  } catch (error) {
    mapError(error);
  }
  const content = Array.isArray(result.content)
    ? (result.content as Array<{ type: string; text?: string }>)
    : [];
  const text = content
    .filter((c) => c.type === "text")
    .map((c) => c.text ?? "")
    .join("\n");
  // A tool-level failure comes back as a normal result with isError set, not
  // as a thrown transport error — so it has to be checked explicitly.
  if (result.isError) throw new Error(text || `${name} failed`);
  return text;
}

/** Call an MCP tool and parse its JSON result. */
export async function callToolJson<T>(
  name: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  return parseJson<T>(await callTool(name, args), name);
}

/** Read an MCP resource and parse its JSON content. */
export async function readResourceJson<T>(uri: string): Promise<T> {
  const client = await getClient();
  let result;
  try {
    result = await client.readResource({ uri });
  } catch (error) {
    mapError(error);
  }
  const text = (result.contents ?? [])
    .map((c) => ("text" in c ? String(c.text) : ""))
    .join("\n");
  return parseJson<T>(text, uri);
}

/** Drop all stored credentials (used when auth is irrecoverably broken). */
export async function signOut(): Promise<void> {
  clientPromise = null;
  await new RaycastOAuthProvider().invalidateCredentials("all");
}
