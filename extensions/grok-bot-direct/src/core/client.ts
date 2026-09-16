import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Entry, record } from "./messages";

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}
export interface TokenStore {
  read(): Promise<SessionTokens | undefined>;
  write(tokens: Tokens): Promise<void>;
}
export interface SessionTokens {
  accessToken: string;
  refreshToken?: string;
}
export interface LoginAttempt {
  uuid: string;
  verifier: string;
  url: string;
  createdAt: number;
}
export interface Gateway {
  gatewayUrl: string;
  gatewayToken: string;
  networkToken: string;
}
export interface Bot {
  id: string;
  name: string;
  description: string;
  title: string;
  avatarShape: string | null;
  avatarColor: string | null;
  avatarDataUrl: string | null;
  isRunning: boolean;
  isGroup: boolean;
  hasUnread: boolean;
  awaitingUserResponse: unknown;
}
export type { Entry } from "./messages";
export interface Transcript {
  entries: Entry[];
  nextBeforeSeq?: number;
}
export class ClientError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly uncertain = false,
  ) {
    super(message);
    this.name = "ClientError";
  }
}
const BACKEND = "https://api2.cursor.sh";
const CLIENT_HEADERS = {
  "x-cursor-client-type": "sand",
  "x-cursor-client-source": "sand-desktop",
  "x-cursor-client-version": "0.43.0",
  "x-sand-box-namespace": "prod",
};

export { record } from "./messages";
export function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim())
    throw new ClientError(`Invalid ${field} in server response.`);
  return value;
}
export function parseTokens(value: unknown): Tokens {
  if (!record(value)) throw new ClientError("Invalid sign-in response.");
  return {
    accessToken: requiredString(value.accessToken, "access token"),
    refreshToken: requiredString(value.refreshToken, "refresh token"),
  };
}
export function createLogin(now = Date.now()): LoginAttempt {
  const verifier = randomBytes(32).toString("base64url");
  const uuid = randomUUID();
  const url = new URL("https://cursor.com/loginDeepControl");
  url.search = new URLSearchParams({
    challenge: createHash("sha256").update(verifier).digest("base64url"),
    uuid,
    mode: "login",
    redirectTarget: "sand",
    supportsSelectedTeamLogin: "true",
  }).toString();
  return { uuid, verifier, url: url.toString(), createdAt: now };
}
export function parseBot(value: unknown): Bot {
  if (!record(value)) throw new ClientError("Invalid bot response.");
  const optional = (key: string): string | null =>
    typeof value[key] === "string" ? (value[key] as string) : null;
  return {
    id: requiredString(value.id, "bot ID"),
    name: requiredString(value.name, "bot name"),
    description: optional("description") ?? "",
    title: optional("title") ?? "",
    avatarShape: optional("avatarShape"),
    avatarColor: optional("avatarColor"),
    avatarDataUrl: optional("avatarDataUrl"),
    isRunning: value.isRunning === true,
    isGroup: value.isGroup === true,
    hasUnread: value.hasUnread === true,
    awaitingUserResponse: value.awaitingUserResponse,
  };
}
export function parseTranscript(value: unknown): Transcript {
  if (!record(value) || !Array.isArray(value.entries))
    throw new ClientError("Invalid conversation response.");
  const entries = value.entries.map((entry): Entry => {
    if (!record(entry)) throw new ClientError("Invalid conversation entry.");
    return {
      ...entry,
      id: requiredString(entry.id, "message ID"),
      kind: requiredString(entry.kind, "message kind"),
    };
  });
  if (
    value.nextBeforeSeq !== undefined &&
    (!Number.isSafeInteger(value.nextBeforeSeq) ||
      Number(value.nextBeforeSeq) < 0)
  )
    throw new ClientError("Invalid conversation cursor.");
  return { entries, nextBeforeSeq: value.nextBeforeSeq as number | undefined };
}
export { entryText } from "./messages";
export { entryAuthor } from "./messages";

/** Direct client for the protocol observed in Grok Bot desktop 0.43.0. */
export class GrokClient {
  private gateway?: Gateway;
  private connecting?: Promise<Gateway>;
  constructor(
    private readonly store: TokenStore,
    private readonly transport: typeof fetch = fetch,
    private readonly options: { allowRefresh?: boolean } = {},
  ) {}

  private async request(
    url: string,
    headers: Record<string, string>,
    body?: unknown,
    signal?: AbortSignal,
    mutation = false,
  ): Promise<unknown> {
    let response: Response;
    try {
      response = await this.transport(url, {
        method: body === undefined ? "GET" : "POST",
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        redirect: "error",
        signal: AbortSignal.any([
          AbortSignal.timeout(30000),
          ...(signal ? [signal] : []),
        ]),
      });
    } catch {
      throw new ClientError(
        mutation
          ? "Delivery is uncertain. Check the conversation before sending again."
          : "Connection failed. Check your connection and retry.",
        undefined,
        mutation,
      );
    }
    if (!response.ok)
      throw new ClientError(
        response.status === 401
          ? "Your session needs to be renewed."
          : response.status === 403
            ? "Cursor denied access to this account or operation."
            : `Grok Bot returned HTTP ${response.status}.`,
        response.status,
        mutation && response.status >= 500,
      );
    try {
      return await response.json();
    } catch {
      throw new ClientError(
        "Grok Bot returned an invalid response.",
        undefined,
        mutation,
      );
    }
  }

  async finishLogin(
    attempt: LoginAttempt,
    signal?: AbortSignal,
  ): Promise<boolean> {
    if (Date.now() - attempt.createdAt > 15 * 60 * 1000)
      throw new ClientError("Sign-in expired. Start sign-in again.");
    const url = new URL("/auth/poll", BACKEND);
    url.search = new URLSearchParams({
      uuid: attempt.uuid,
      verifier: attempt.verifier,
    }).toString();
    try {
      await this.store.write(
        parseTokens(await this.request(url.toString(), {}, undefined, signal)),
      );
      this.gateway = undefined;
      return true;
    } catch (error) {
      if (error instanceof ClientError && error.status === 404) return false;
      throw error;
    }
  }

  private async refresh(tokens: SessionTokens): Promise<Tokens> {
    if (this.options.allowRefresh === false)
      throw new ClientError(
        "Reconnect from Raycast to renew this chat session.",
        401,
      );
    if (!tokens.refreshToken)
      throw new ClientError("Sign in again to renew your session.", 401);
    const value = await this.request(
      `${BACKEND}/oauth/token`,
      { "content-type": "application/json" },
      {
        client_id: "KbZUR41cY7W6zRSdpSUJ7I7mLYBKOCmB",
        grant_type: "refresh_token",
        refresh_token: tokens.refreshToken,
      },
    );
    if (!record(value))
      throw new ClientError("Session renewal failed. Sign in again.");
    const updated = {
      accessToken: requiredString(value.access_token, "renewed access token"),
      refreshToken:
        typeof value.refresh_token === "string" && value.refresh_token
          ? value.refresh_token
          : tokens.refreshToken,
    };
    await this.store.write(updated);
    return updated;
  }

  private async connect(): Promise<Gateway> {
    let tokens = await this.store.read();
    if (!tokens)
      throw new ClientError("Sign in with Cursor to connect your bots.", 401);
    const call = (): Promise<unknown> =>
      this.request(
        `${BACKEND}/aiserver.v1.GrokBotService/EnsureSandBox`,
        {
          ...CLIENT_HEADERS,
          Authorization: `Bearer ${tokens!.accessToken}`,
          "Content-Type": "application/json",
          "Connect-Protocol-Version": "1",
        },
        {},
      );
    let value: unknown;
    try {
      value = await call();
    } catch (error) {
      if (!(error instanceof ClientError) || error.status !== 401) throw error;
      tokens = await this.refresh(tokens);
      value = await call();
    }
    if (!record(value))
      throw new ClientError("Invalid bot connection response.");
    const gatewayUrl = requiredString(value.gatewayUrl, "gateway URL");
    const url = new URL(gatewayUrl);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      throw new ClientError(
        "The bot gateway is not a valid secure HTTPS endpoint.",
      );
    return {
      gatewayUrl: gatewayUrl.replace(/\/$/, ""),
      gatewayToken: requiredString(value.gatewayToken, "gateway token"),
      networkToken: requiredString(value.networkToken, "network token"),
    };
  }
  private async connection(): Promise<Gateway> {
    if (this.gateway) return this.gateway;
    this.connecting ??= this.connect();
    try {
      this.gateway = await this.connecting;
      return this.gateway;
    } finally {
      this.connecting = undefined;
    }
  }
  async command(
    command: string,
    body: Record<string, unknown>,
    options: { signal?: AbortSignal; mutation?: boolean } = {},
  ): Promise<unknown> {
    if (!/^[a-zA-Z]+$/.test(command))
      throw new ClientError("Invalid bot command.");
    const call = async (): Promise<unknown> => {
      const gateway = await this.connection();
      return this.request(
        `${gateway.gatewayUrl}/api/${command}`,
        {
          Authorization: `Bearer ${gateway.gatewayToken}`,
          "x-anyrun-network-token": gateway.networkToken,
          "Content-Type": "application/json",
        },
        body,
        options.signal,
        options.mutation,
      );
    };
    try {
      return await call();
    } catch (error) {
      if (
        error instanceof ClientError &&
        (error.status === 401 || error.status === 403)
      ) {
        this.gateway = undefined;
        if (!options.mutation) return await call();
      }
      throw error;
    }
  }
  async bots(signal?: AbortSignal): Promise<Bot[]> {
    const value = await this.command("listAgents", {}, { signal });
    if (!Array.isArray(value)) throw new ClientError("Invalid bot roster.");
    return value.map(parseBot);
  }
  async transcript(
    id: string,
    beforeSeq?: number,
    signal?: AbortSignal,
  ): Promise<Transcript> {
    return parseTranscript(
      await this.command(
        beforeSeq === undefined
          ? "getAgentTranscriptTail"
          : "getAgentTranscriptPage",
        {
          id,
          limit: beforeSeq === undefined ? 20 : 60,
          ...(beforeSeq !== undefined ? { beforeSeq } : {}),
        },
        { signal },
      ),
    );
  }

  async thread(
    id: string,
    rootId: string,
    signal?: AbortSignal,
  ): Promise<Transcript> {
    return parseTranscript(
      await this.command("getAgentThread", { id, rootId }, { signal }),
    );
  }
  async send(
    agentId: string,
    prompt: string,
    clientNonce: string,
    replyToId?: string,
    attachments: { path: string; name: string }[] = [],
  ): Promise<void> {
    if (!prompt.trim()) throw new ClientError("Write a message first.");
    if (prompt.length > 100000)
      throw new ClientError(
        "The message is too long. Send at most 100,000 characters.",
      );
    if (attachments.length > 6)
      throw new ClientError("Attach at most six files.");
    const result = await this.command(
      "sendPrompt",
      {
        agentId,
        prompt,
        clientNonce,
        ...(replyToId ? { replyToId } : {}),
        ...(attachments.length
          ? {
              attachmentPaths: attachments.map((a) => a.path),
              attachmentNames: attachments.map((a) => a.name),
            }
          : {}),
      },
      { mutation: true },
    );
    if (!record(result) || result.accepted !== true)
      throw new ClientError(
        "Message acceptance was not confirmed. Check the conversation before retrying.",
        undefined,
        true,
      );
  }
}
