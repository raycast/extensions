import { randomUUID } from "node:crypto";
import {
  GatewayProtocolClient,
  buildDeviceAuthPayloadV3,
  buildGatewayConnectAuth,
  resolveGatewayConnectScopes,
  selectGatewayConnectAuth,
  type GatewayBrowserDeviceAuthPlan,
} from "@openclaw/gateway-client/browser";
import {
  MIN_CLIENT_PROTOCOL_VERSION,
  PROTOCOL_VERSION,
} from "@openclaw/gateway-protocol/version";
import type { EventFrame, HelloOk } from "@openclaw/gateway-protocol";
import WebSocket, { type RawData } from "ws";
import type { DeviceAuthTokenRecord, DeviceIdentity } from "./device-identity";

const REQUEST_TIMEOUT_MS = 30_000;
const CONNECT_CHALLENGE_TIMEOUT_MS = 15_000;
const STOP_TIMEOUT_MS = 1_000;

type GatewayClientOptions = {
  url: string;
  edgeAuthHeaders?: Readonly<Record<string, string>>;
  token?: string;
  password?: string;
  deviceAuth?: DeviceAuthTokenRecord;
  deviceIdentity: DeviceIdentity;
  instanceId: string;
  clientName: "gateway-client";
  clientDisplayName: string;
  clientVersion: string;
  platform: string;
  deviceFamily: string;
  mode: "ui";
  role: string;
  scopes: string[];
  hostDeps: {
    signDevicePayload: (privateKeyPem: string, payload: string) => string;
    publicKeyRawBase64UrlFromPem: (publicKeyPem: string) => string;
    storeDeviceAuthToken: (record: DeviceAuthTokenRecord) => void;
  };
  onEvent?: (event: EventFrame) => void;
  onHelloOk?: (hello: HelloOk) => void;
  onConnectError?: (error: Error) => void;
  onClose?: (code: number, reason: string) => void;
};

type ConnectPlan = GatewayBrowserDeviceAuthPlan & {
  params: {
    minProtocol: number;
    maxProtocol: number;
    client: {
      id: "gateway-client";
      displayName: string;
      version: string;
      platform: string;
      deviceFamily: string;
      mode: "ui";
      instanceId: string;
    };
    caps: string[];
    auth: GatewayBrowserDeviceAuthPlan["auth"];
    role: string;
    scopes: string[];
    device: NonNullable<GatewayBrowserDeviceAuthPlan["device"]>;
  };
};

function errorWithDetails(message: string, details?: unknown): Error {
  const error = new Error(message) as Error & { details?: unknown };
  error.details = details;
  return error;
}

function socketMessage(data: RawData): string {
  if (typeof data === "string") return data;
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString("utf8");
  if (Array.isArray(data)) return Buffer.concat(data).toString("utf8");
  return data.toString("utf8");
}

export class RaycastGatewayClient {
  private readonly protocol: GatewayProtocolClient<ConnectPlan>;
  private socket: WebSocket | undefined;
  private stopped = false;

  constructor(private readonly options: GatewayClientOptions) {
    this.protocol = new GatewayProtocolClient<ConnectPlan>({
      createSocket: (handlers) => {
        const socket = new WebSocket(options.url, {
          maxPayload: 25 * 1024 * 1024,
          handshakeTimeout: CONNECT_CHALLENGE_TIMEOUT_MS,
          followRedirects: false,
          headers: options.edgeAuthHeaders,
        });
        this.socket = socket;
        let upgradeError: Error | undefined;

        socket.on("open", handlers.open);
        socket.on("message", (data) => handlers.message(socketMessage(data)));
        socket.on("close", (code, reason) => {
          if (this.socket === socket) this.socket = undefined;
          handlers.close(code, reason.toString());
        });
        socket.on("unexpected-response", (request, response) => {
          const status = response.statusCode ?? "unknown";
          const location = response.headers.location;
          upgradeError = errorWithDetails(
            `Gateway rejected the WebSocket upgrade with HTTP ${status}.`,
            {
              code: "UNAVAILABLE",
              httpStatus: response.statusCode,
              location: Array.isArray(location) ? location[0] : location,
            },
          );
          handlers.error(upgradeError);
          request.destroy();
          socket.close();
        });
        socket.on("error", (error) => {
          if (!upgradeError) handlers.error(error);
        });

        return {
          isOpen: () => socket.readyState === WebSocket.OPEN,
          send: (data) => socket.send(data),
          close: (code, reason) => socket.close(code, reason),
        };
      },
      createRequestId: randomUUID,
      buildConnectPlan: ({ nonce, challengeTs }) =>
        this.buildConnectPlan(nonce, challengeTs),
      buildConnectParams: (plan) => plan.params,
      onConnectPlanError: (error) => ({
        closeCode: 1008,
        closeReason: "connect failed",
        stop: true,
        error,
      }),
      onConnectHello: (hello, { plan }) => {
        const token = hello.auth?.deviceToken?.trim();
        if (token) {
          options.hostDeps.storeDeviceAuthToken({
            token,
            scopes: hello.auth?.scopes ?? plan.scopes,
          });
        }
      },
      onHello: options.onHelloOk,
      onConnectFailure: (error) => {
        options.onConnectError?.(error);
        return {
          closeCode: 1008,
          closeReason: "connect failed",
          stop: true,
          error,
        };
      },
      resolveClose: (context) => ({
        retry: false,
        notify: true,
        pendingError: context.connectFailure?.error,
      }),
      onClose: (context) => options.onClose?.(context.code, context.reason),
      onConnectError: options.onConnectError,
      onEvent: options.onEvent,
      handshake: {
        mode: "require-challenge",
        timeoutMs: CONNECT_CHALLENGE_TIMEOUT_MS,
      },
      reconnect: { initialMs: 1_000, multiplier: 2, maxMs: 30_000 },
      requestTimeoutMs: REQUEST_TIMEOUT_MS,
      shouldRetrySocketFactoryError: () => false,
    });
  }

  get connected(): boolean {
    return !this.stopped && this.protocol.connected;
  }

  start(): void {
    if (!this.stopped) this.protocol.start();
  }

  request<T>(method: string, params?: unknown): Promise<T> {
    return this.protocol.request<T>(method, params);
  }

  async stopAndWait(): Promise<void> {
    this.stopped = true;
    const socket = this.socket;
    this.protocol.stop();
    if (!socket || socket.readyState === WebSocket.CLOSED) return;

    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        socket.terminate();
        resolve();
      }, STOP_TIMEOUT_MS);
      timeout.unref?.();
      socket.once("close", () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }

  private async buildConnectPlan(
    nonce: string | null,
    challengeTs: number | null | undefined,
  ): Promise<ConnectPlan> {
    if (!nonce)
      throw new Error("Gateway connect challenge is missing a nonce.");
    if (challengeTs == null) {
      throw new Error("Gateway connect challenge timestamp is invalid.");
    }

    const selectedAuth = selectGatewayConnectAuth({
      token: this.options.token,
      password: this.options.password,
      storedToken: this.options.deviceAuth?.token,
      storedScopes: this.options.deviceAuth?.scopes,
    });
    const scopes = resolveGatewayConnectScopes({
      requestedScopes: selectedAuth.authBootstrapToken
        ? this.options.scopes
        : undefined,
      usingStoredDeviceToken: selectedAuth.usingStoredDeviceToken,
      storedScopes: selectedAuth.storedScopes,
      defaultScopes: this.options.scopes,
    });
    const client = {
      id: this.options.clientName,
      displayName: this.options.clientDisplayName,
      version: this.options.clientVersion,
      platform: this.options.platform,
      deviceFamily: this.options.deviceFamily,
      mode: this.options.mode,
      instanceId: this.options.instanceId,
    } as const;
    const signatureToken =
      selectedAuth.authBootstrapToken ?? selectedAuth.signatureToken ?? null;
    const payload = buildDeviceAuthPayloadV3({
      deviceId: this.options.deviceIdentity.deviceId,
      clientId: client.id,
      clientMode: client.mode,
      role: this.options.role,
      scopes,
      signedAtMs: challengeTs,
      token: signatureToken,
      nonce,
      platform: client.platform,
      deviceFamily: client.deviceFamily,
    });
    const device = {
      id: this.options.deviceIdentity.deviceId,
      publicKey: this.options.hostDeps.publicKeyRawBase64UrlFromPem(
        this.options.deviceIdentity.publicKeyPem,
      ),
      signature: this.options.hostDeps.signDevicePayload(
        this.options.deviceIdentity.privateKeyPem,
        payload,
      ),
      signedAt: challengeTs,
      nonce,
    };

    return {
      clientId: client.id,
      role: this.options.role,
      identity: {
        deviceId: this.options.deviceIdentity.deviceId,
        publicKey: device.publicKey,
        sign: async (value) =>
          this.options.hostDeps.signDevicePayload(
            this.options.deviceIdentity.privateKeyPem,
            value,
          ),
      },
      selectedAuth,
      scopes,
      auth: buildGatewayConnectAuth(selectedAuth),
      device,
      params: {
        minProtocol: MIN_CLIENT_PROTOCOL_VERSION,
        maxProtocol: PROTOCOL_VERSION,
        client,
        caps: [],
        auth: buildGatewayConnectAuth(selectedAuth),
        role: this.options.role,
        scopes,
        device,
      },
    };
  }
}
