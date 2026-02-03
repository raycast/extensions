import WebSocket from "ws";
import {
  PROTOCOL_VERSION,
  type ConnectParams,
  type RequestFrame,
  type ResponseFrame,
  type EventFrame,
  type HelloOk,
  type ErrorShape,
  type HealthResult,
  type ChannelsStatusResult,
  type SkillsStatusResult,
  type CronJob,
  type CronStatusResult,
  type CronRunLogEntry,
  type CronRunsResult,
  type CronListResult,
  type ChatHistoryResult,
  type ChatSendParams,
  type ChatSendResult,
  type ChatAbortResult,
} from "./types";
import { getGatewayUrl, getAuthConfig } from "./preferences";
import {
  getDeviceIdentity,
  getPublicKeyBase64Url,
  buildDeviceAuthPayload,
  signPayload,
} from "./device-identity";

import pkg from "../../package.json" with { type: "json" };

// Client identification - must use schema-valid values
const CLIENT_ID = "cli";
const CLIENT_VERSION = pkg.version;
const CLIENT_MODE = "cli";

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
}

type EventCallback = (event: EventFrame) => void;

interface GatewayFrame {
  type: string;
  [key: string]: unknown;
}

export class GatewayClient {
  private ws: WebSocket | null = null;
  private requestId = 0;
  private pending = new Map<string, PendingRequest>();
  private connected = false;
  private helloOk: HelloOk | null = null;
  private eventCallbacks = new Map<string, Set<EventCallback>>();
  private connectPromise: Promise<void> | null = null;
  private connectNonce: string | null = null;

  private url: string;
  private password?: string;

  constructor(url: string, password?: string) {
    this.url = url;
    this.password = password;
  }

  async connect(): Promise<HelloOk> {
    if (this.connected && this.helloOk) {
      return this.helloOk;
    }

    if (this.connectPromise) {
      await this.connectPromise;
      if (this.helloOk) return this.helloOk;
      throw new Error("Connection failed");
    }

    this.connectPromise = this.doConnect();
    try {
      await this.connectPromise;
      if (!this.helloOk) throw new Error("No hello response received");
      return this.helloOk;
    } finally {
      this.connectPromise = null;
    }
  }

  private async doConnect(): Promise<void> {
    // Get device identity first (generates keypair if needed)
    const deviceIdentity = await getDeviceIdentity();

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.ws?.close();
        reject(new Error(`Connection timeout connecting to ${this.url}`));
      }, 15000);

      try {
        const wsOptions: WebSocket.ClientOptions = {};
        if (this.url.startsWith("wss://")) {
          wsOptions.rejectUnauthorized = true;
        }
        this.ws = new WebSocket(this.url, wsOptions);
      } catch (err) {
        clearTimeout(timeoutId);
        const message = err instanceof Error ? err.message : String(err);
        reject(
          new Error(`Failed to create WebSocket to ${this.url}: ${message}`),
        );
        return;
      }

      const sendConnect = (nonce: string, ts: number) => {
        const connectId = `connect-${++this.requestId}`;

        const role = "operator";
        const scopes = ["operator.read", "operator.write", "operator.admin"];

        // Build the payload to sign (pipe-delimited format)
        const payload = buildDeviceAuthPayload({
          deviceId: deviceIdentity.deviceId,
          clientId: CLIENT_ID,
          clientMode: CLIENT_MODE,
          role,
          scopes,
          signedAtMs: ts,
          token: null,
          nonce,
        });

        // Sign with Ed25519
        const signature = signPayload(deviceIdentity.privateKeyPem, payload);

        // Get public key as base64url
        const publicKeyBase64Url = getPublicKeyBase64Url(
          deviceIdentity.publicKeyPem,
        );

        const connectParams: ConnectParams = {
          minProtocol: PROTOCOL_VERSION,
          maxProtocol: PROTOCOL_VERSION,
          client: {
            id: CLIENT_ID,
            version: CLIENT_VERSION,
            platform: "macos",
            mode: CLIENT_MODE,
          },
          role,
          scopes,
          caps: [],
          commands: [],
          permissions: {},
          auth: this.password ? { password: this.password } : undefined,
          locale: "en-US",
          userAgent: `raycast-openclaw/${CLIENT_VERSION}`,
          device: {
            id: deviceIdentity.deviceId,
            publicKey: publicKeyBase64Url,
            signature,
            signedAt: ts,
            nonce,
          },
        };

        const frame: RequestFrame = {
          type: "req",
          id: connectId,
          method: "connect",
          params: connectParams as unknown as Record<string, unknown>,
        };
        this.ws?.send(JSON.stringify(frame));

        const connectTimeoutId = setTimeout(() => {
          this.pending.delete(connectId);
          reject(new Error(`Connect timeout for ${this.url}`));
        }, 10000);

        this.pending.set(connectId, {
          resolve: (payload) => {
            clearTimeout(connectTimeoutId);
            clearTimeout(timeoutId);
            this.helloOk = payload as HelloOk;
            this.connected = true;
            resolve();
          },
          reject: (err) => {
            clearTimeout(connectTimeoutId);
            clearTimeout(timeoutId);
            reject(err);
          },
          timeoutId: connectTimeoutId,
        });
      };

      this.ws.on("open", () => {
        // Wait for connect.challenge event before sending connect
      });

      this.ws.on("message", (data) => {
        try {
          const frame = JSON.parse(data.toString()) as GatewayFrame;

          if (frame.type === "event") {
            const evtFrame = frame as unknown as EventFrame;

            if (evtFrame.event === "connect.challenge") {
              const payload = evtFrame.payload as
                | { nonce?: string; ts?: number }
                | undefined;
              if (payload?.nonce && payload?.ts) {
                this.connectNonce = payload.nonce;
                sendConnect(payload.nonce, payload.ts);
              }
              return;
            }

            const callbacks = this.eventCallbacks.get(evtFrame.event);
            if (callbacks) {
              for (const cb of callbacks) {
                try {
                  cb(evtFrame);
                } catch {
                  // Ignore callback errors
                }
              }
            }
            return;
          }

          // Handle response frames
          if (frame.type === "res") {
            const resFrame = frame as unknown as ResponseFrame;
            const pending = this.pending.get(resFrame.id);
            if (pending) {
              clearTimeout(pending.timeoutId);
              this.pending.delete(resFrame.id);
              if (resFrame.ok) {
                pending.resolve(resFrame.payload);
              } else {
                const err = resFrame.error as ErrorShape | undefined;
                const errorMsg = err?.message || "Request failed";
                const errorCode = err?.code ? ` (${err.code})` : "";
                pending.reject(new Error(`${errorMsg}${errorCode}`));
              }
            }
            return;
          }
        } catch {
          // Ignore parse errors
        }
      });

      this.ws.on("error", (err) => {
        clearTimeout(timeoutId);
        this.connected = false;
        const message = err instanceof Error ? err.message : String(err);
        reject(
          new Error(`WebSocket error connecting to ${this.url}: ${message}`),
        );
      });

      this.ws.on("close", (code) => {
        clearTimeout(timeoutId);
        this.connected = false;
        this.helloOk = null;
        this.connectNonce = null;

        // Reject all pending requests
        for (const [id, pending] of this.pending) {
          clearTimeout(pending.timeoutId);
          pending.reject(new Error(`Connection closed (code: ${code})`));
          this.pending.delete(id);
        }

        // Reject the connect promise if we never completed the handshake
        reject(
          new Error(
            `Connection closed before handshake completed (code: ${code})`,
          ),
        );
      });
    });
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.helloOk = null;
    this.connectNonce = null;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getSnapshot(): HelloOk | null {
    return this.helloOk;
  }

  getUrl(): string {
    return this.url;
  }

  onEvent(event: string, callback: EventCallback): () => void {
    let callbacks = this.eventCallbacks.get(event);
    if (!callbacks) {
      callbacks = new Set();
      this.eventCallbacks.set(event, callbacks);
    }
    callbacks.add(callback);

    return () => {
      callbacks?.delete(callback);
      if (callbacks?.size === 0) {
        this.eventCallbacks.delete(event);
      }
    };
  }

  async request<T>(
    method: string,
    params?: Record<string, unknown>,
    timeoutMs = 30000,
  ): Promise<T> {
    await this.connect();

    return new Promise((resolve, reject) => {
      const id = `req-${++this.requestId}`;

      const timeoutId = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Request timeout: ${method}`));
      }, timeoutMs);

      this.pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeoutId,
      });

      const frame: RequestFrame = {
        type: "req",
        id,
        method,
        params,
      };

      this.ws?.send(JSON.stringify(frame));
    });
  }

  // Typed convenience methods

  async health(probe = false): Promise<HealthResult> {
    return this.request<HealthResult>(
      "health",
      probe ? { probe: true } : undefined,
    );
  }

  async channelsStatus(
    probe = false,
    timeoutMs = 10000,
  ): Promise<ChannelsStatusResult> {
    return this.request<ChannelsStatusResult>(
      "channels.status",
      { probe, timeoutMs },
      timeoutMs + 5000,
    );
  }

  async skillsStatus(): Promise<SkillsStatusResult> {
    return this.request<SkillsStatusResult>("skills.status", {});
  }

  async skillsUpdate(skillKey: string, enabled: boolean): Promise<void> {
    await this.request("skills.update", { skillKey, enabled });
  }

  async cronList(includeDisabled = true): Promise<CronJob[]> {
    const result = await this.request<CronListResult>("cron.list", {
      includeDisabled,
    });
    return result.jobs;
  }

  async cronStatus(): Promise<CronStatusResult> {
    return this.request<CronStatusResult>("cron.status", {});
  }

  async cronRun(jobId: string, mode: "due" | "force" = "force"): Promise<void> {
    await this.request("cron.run", { jobId, mode });
  }

  async cronRuns(jobId: string, limit = 20): Promise<CronRunLogEntry[]> {
    const result = await this.request<CronRunsResult>("cron.runs", {
      jobId,
      limit,
    });
    return result.entries;
  }

  async cronUpdate(jobId: string, patch: { enabled?: boolean }): Promise<void> {
    await this.request("cron.update", { jobId, patch });
  }

  async chatHistory(
    sessionKey: string,
    limit = 50,
  ): Promise<ChatHistoryResult> {
    return this.request<ChatHistoryResult>("chat.history", {
      sessionKey,
      limit,
    });
  }

  async chatSend(params: ChatSendParams): Promise<ChatSendResult> {
    return this.request<ChatSendResult>(
      "chat.send",
      params as unknown as Record<string, unknown>,
    );
  }

  async chatAbort(
    sessionKey: string,
    runId?: string,
  ): Promise<ChatAbortResult> {
    return this.request<ChatAbortResult>("chat.abort", { sessionKey, runId });
  }
}

// Cached client - recreated when URL changes
let clientInstance: GatewayClient | null = null;
let cachedUrl: string | null = null;

export function getGatewayClient(): GatewayClient {
  const url = getGatewayUrl();
  const auth = getAuthConfig();

  // Recreate client if URL changed
  if (clientInstance && cachedUrl !== url) {
    clientInstance.disconnect();
    clientInstance = null;
  }

  if (!clientInstance) {
    clientInstance = new GatewayClient(url, auth.password);
    cachedUrl = url;
  }

  return clientInstance;
}

export function resetGatewayClient(): void {
  if (clientInstance) {
    clientInstance.disconnect();
    clientInstance = null;
    cachedUrl = null;
  }
}
