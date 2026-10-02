import { randomUUID } from "node:crypto";
import type { EventFrame, HelloOk } from "@openclaw/gateway-protocol";
import { resolveEdgeAuthHeaders } from "./cloudflare-access";
import {
  getPreferences,
  type CloudflareAuthMode,
  type ConnectionMode,
  type ResolvedPreferences,
} from "./config";
import {
  type DeviceAuthTokenRecord,
  loadDeviceAuthToken,
  loadOrCreateDeviceIdentity,
  loadOrCreateInstanceId,
  publicKeyRawBase64UrlFromPem,
  signDevicePayload,
  storeDeviceAuthToken,
} from "./device-identity";
import { RaycastGatewayClient } from "./gateway-client";

const ROLE = "operator";
const SCOPES = ["operator.read", "operator.write"];
const RUN_TIMEOUT_MS = 5 * 60 * 1000;

type ChatEvent = {
  runId: string;
  sessionKey: string;
  state: "status" | "delta" | "final" | "aborted" | "error";
  deltaText?: string;
  replace?: boolean;
  message?: unknown;
  errorMessage?: string;
};

type ChatSendAck = {
  runId?: string;
  status?: "started" | "in_flight" | "ok" | "timeout" | "error";
  error?: string;
};

type SessionCreateResult = {
  ok: boolean;
  key: string;
  sessionId?: string;
};

type ChatHistoryResult = {
  kind?: "delta" | "reset";
  messages?: unknown[];
};

type RunWaiter = {
  sessionKey: string;
  content: string;
  onDelta?: (content: string) => void;
  resolve: (content: string) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
};

export type GatewayConnection = {
  connectionMode: ConnectionMode;
  cloudflareAuthMode: CloudflareAuthMode;
  gatewayUrl: string;
  webUrl: string;
  agentId: string;
  latencyMs: number;
  serverVersion: string;
  protocol: number;
  presenceCount: number;
  healthOk: boolean;
  methods: string[];
};

export type SendMessageOptions = {
  sessionKey?: string;
  agentId?: string;
  label?: string;
  onStream?: (content: string) => void;
  onSession?: (sessionKey: string) => void;
};

export type SendMessageResult = {
  sessionKey: string;
  content: string;
};

export type GatewayHistoryMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

function extractMessageText(message: unknown): string {
  if (typeof message === "string") return message;
  if (!message || typeof message !== "object") return "";

  const content = (message as { content?: unknown }).content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (!part || typeof part !== "object") return "";
      const text = (part as { text?: unknown }).text;
      return typeof text === "string" ? text : "";
    })
    .filter(Boolean)
    .join("\n");
}

function historyTimestamp(message: Record<string, unknown>): number {
  const value =
    message.timestamp ?? message.createdAt ?? message.createdAtMs ?? message.ts;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return Date.now();
}

function historyMessage(value: unknown): GatewayHistoryMessage | undefined {
  if (!value || typeof value !== "object") return undefined;
  const envelope = value as Record<string, unknown>;
  const nested =
    envelope.message && typeof envelope.message === "object"
      ? (envelope.message as Record<string, unknown>)
      : undefined;
  const message = nested ?? envelope;
  const role = message.role;
  if (role !== "user" && role !== "assistant") return undefined;
  const content = extractMessageText(message);
  if (!content) return undefined;
  return { role, content, timestamp: historyTimestamp(message) };
}

function describeConnectError(error: Error): string {
  const details = (error as Error & { details?: unknown }).details;
  const detailRecord =
    details && typeof details === "object"
      ? (details as Record<string, unknown>)
      : undefined;
  const detailCode =
    typeof detailRecord?.code === "string" ? detailRecord.code : undefined;
  const requestId =
    typeof detailRecord?.requestId === "string"
      ? detailRecord.requestId
      : undefined;
  const message = detailCode
    ? `${error.message} (${detailCode})`
    : error.message;

  if (detailCode === "PAIRING_REQUIRED" && requestId) {
    return `${message} Approve this Raycast device with: openclaw devices approve ${requestId}`;
  }

  return message;
}

function isChatEvent(payload: unknown): payload is ChatEvent {
  if (!payload || typeof payload !== "object") return false;
  const candidate = payload as Partial<ChatEvent>;
  return (
    typeof candidate.runId === "string" &&
    typeof candidate.sessionKey === "string" &&
    typeof candidate.state === "string"
  );
}

export class OpenClawGateway {
  private readonly runWaiters = new Map<string, RunWaiter>();

  private constructor(
    private readonly client: RaycastGatewayClient,
    private readonly preferences: ResolvedPreferences,
    private readonly hello: HelloOk,
    private readonly handshakeLatencyMs: number,
    private readonly storageWrites: Promise<void>[],
  ) {}

  static async connect(): Promise<OpenClawGateway> {
    const preferences = getPreferences();
    const identity = await loadOrCreateDeviceIdentity();
    const instanceId = await loadOrCreateInstanceId();
    const deviceToken = await loadDeviceAuthToken(preferences.gatewayUrl, ROLE);
    const storageWrites: Promise<void>[] = [];
    const startedAt = Date.now();
    const edgeAuthHeaders = await resolveEdgeAuthHeaders(preferences);
    let gateway: OpenClawGateway | undefined;
    let settled = false;
    let closeAfterHelloError: Error | undefined;

    let resolveHello!: (hello: HelloOk) => void;
    let rejectHello!: (error: Error) => void;
    const helloPromise = new Promise<HelloOk>((resolve, reject) => {
      resolveHello = resolve;
      rejectHello = reject;
    });

    const client = new RaycastGatewayClient({
      url: preferences.gatewayUrl,
      edgeAuthHeaders,
      token: preferences.token || undefined,
      password: preferences.password || undefined,
      deviceAuth: deviceToken ?? undefined,
      deviceIdentity: identity,
      instanceId,
      clientName: "gateway-client",
      clientDisplayName: "Raycast OpenClaw",
      clientVersion: "2026.9.4",
      platform: process.platform,
      deviceFamily: "Mac",
      mode: "ui",
      role: ROLE,
      scopes: SCOPES,
      hostDeps: {
        signDevicePayload,
        publicKeyRawBase64UrlFromPem,
        storeDeviceAuthToken: ({ token, scopes }) => {
          const record: DeviceAuthTokenRecord = { token, scopes };
          storageWrites.push(
            storeDeviceAuthToken(preferences.gatewayUrl, ROLE, record),
          );
        },
      },
      onEvent: (event) => gateway?.handleEvent(event),
      onHelloOk: (hello) => {
        if (settled) return;
        settled = true;
        resolveHello(hello);
      },
      onConnectError: (error) => {
        if (settled) return;
        settled = true;
        rejectHello(new Error(describeConnectError(error)));
      },
      onClose: (_code, reason) => {
        const closeError = new Error(
          reason || `Connection to ${preferences.gatewayUrl} closed.`,
        );
        if (!settled) {
          settled = true;
          rejectHello(closeError);
        } else if (!gateway) {
          closeAfterHelloError = closeError;
        }
        gateway?.failRuns(closeError);
      },
    });

    client.start();

    try {
      const hello = await helloPromise;
      if (closeAfterHelloError || !client.connected) {
        throw (
          closeAfterHelloError ??
          new Error(`Connection to ${preferences.gatewayUrl} closed.`)
        );
      }
      gateway = new OpenClawGateway(
        client,
        preferences,
        hello,
        Date.now() - startedAt,
        storageWrites,
      );
      return gateway;
    } catch (error) {
      await client.stopAndWait();
      await Promise.allSettled(storageWrites);
      throw error;
    }
  }

  get connection(): GatewayConnection {
    return {
      connectionMode: this.preferences.connectionMode,
      cloudflareAuthMode: this.preferences.cloudflareAuthMode,
      gatewayUrl: this.preferences.gatewayUrl,
      webUrl: this.preferences.webUrl,
      agentId: this.preferences.agentId,
      latencyMs: this.handshakeLatencyMs,
      serverVersion: this.hello.server.version,
      protocol: this.hello.protocol,
      presenceCount: this.hello.snapshot.presence.length,
      healthOk: this.hello.snapshot.health.ok === true,
      methods: this.hello.features.methods,
    };
  }

  supports(method: string): boolean {
    return this.hello.features.methods.includes(method);
  }

  async request<T>(method: string, params?: unknown): Promise<T> {
    if (!this.supports(method)) {
      throw new Error(
        `OpenClaw ${this.hello.server.version} does not advertise ${method}.`,
      );
    }

    return this.client.request<T>(method, params);
  }

  async createSession(label?: string, agentId?: string): Promise<string> {
    const result = await this.request<SessionCreateResult>("sessions.create", {
      idempotencyKey: randomUUID(),
      agentId: agentId ?? this.preferences.agentId,
      label: label?.trim().slice(0, 100) || undefined,
    });

    if (!result.ok || !result.key) {
      throw new Error("OpenClaw did not create a session.");
    }

    return result.key;
  }

  async sendMessage(
    message: string,
    options: SendMessageOptions = {},
  ): Promise<SendMessageResult> {
    const sessionKey =
      options.sessionKey ??
      (await this.createSession(options.label, options.agentId));
    options.onSession?.(sessionKey);
    const requestedRunId: string = randomUUID();
    let activeRunId = requestedRunId;
    const responsePromise = new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.runWaiters.delete(activeRunId);
        reject(new Error("OpenClaw did not finish within five minutes."));
      }, RUN_TIMEOUT_MS);

      this.runWaiters.set(requestedRunId, {
        sessionKey,
        content: "",
        onDelta: options.onStream,
        resolve,
        reject,
        timeout,
      });
    });

    try {
      const ack = await this.request<ChatSendAck>("chat.send", {
        sessionKey,
        agentId: options.agentId ?? this.preferences.agentId,
        message,
        deliver: false,
        idempotencyKey: requestedRunId,
      });

      if (ack.status === "error" || ack.status === "timeout") {
        throw new Error(ack.error || `OpenClaw run ${ack.status}.`);
      }

      if (ack.runId && ack.runId !== requestedRunId) {
        const waiter = this.runWaiters.get(requestedRunId);
        if (waiter) {
          this.runWaiters.delete(requestedRunId);
          this.runWaiters.set(ack.runId, waiter);
          activeRunId = ack.runId;
        }
      }

      const content = await responsePromise;
      return { sessionKey, content };
    } catch (error) {
      const waiter = this.runWaiters.get(activeRunId);
      if (waiter) clearTimeout(waiter.timeout);
      this.runWaiters.delete(activeRunId);
      throw error;
    }
  }

  async getSessionHistory(
    sessionKey: string,
    agentId?: string,
  ): Promise<GatewayHistoryMessage[]> {
    const result = await this.request<ChatHistoryResult>("chat.history", {
      sessionKey,
      agentId: agentId ?? this.preferences.agentId,
      limit: 1_000,
      maxChars: 500_000,
    });

    if (result.kind === "reset") return [];
    return (result.messages ?? []).flatMap((message) => {
      const normalized = historyMessage(message);
      return normalized ? [normalized] : [];
    });
  }

  async close(): Promise<void> {
    this.failRuns(new Error("The OpenClaw Gateway connection was closed."));
    await this.client.stopAndWait();
    await Promise.allSettled(this.storageWrites);
  }

  private handleEvent(event: EventFrame): void {
    if (event.event !== "chat" || !isChatEvent(event.payload)) return;
    const payload = event.payload;
    const waiter = this.runWaiters.get(payload.runId);
    if (!waiter || waiter.sessionKey !== payload.sessionKey) return;

    if (payload.state === "delta") {
      waiter.content = payload.replace
        ? (payload.deltaText ?? "")
        : waiter.content + (payload.deltaText ?? "");
      waiter.onDelta?.(waiter.content);
      return;
    }

    if (payload.state === "status") return;

    clearTimeout(waiter.timeout);
    this.runWaiters.delete(payload.runId);

    if (payload.state === "final") {
      const content = waiter.content || extractMessageText(payload.message);
      if (content) {
        waiter.resolve(content);
      } else {
        waiter.reject(
          new Error("OpenClaw finished without returning a text response."),
        );
      }
      return;
    }

    waiter.reject(
      new Error(
        payload.errorMessage ||
          (payload.state === "aborted"
            ? "OpenClaw stopped the run."
            : "OpenClaw could not complete the run."),
      ),
    );
  }

  private failRuns(error: Error): void {
    for (const waiter of this.runWaiters.values()) {
      clearTimeout(waiter.timeout);
      waiter.reject(error);
    }
    this.runWaiters.clear();
  }
}
