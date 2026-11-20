declare module "@openclaw/gateway-client/browser" {
  import type { EventFrame, HelloOk } from "@openclaw/gateway-protocol";

  export type GatewayConnectAuthSelection = {
    authToken?: string;
    authBootstrapToken?: string;
    authDeviceToken?: string;
    authPassword?: string;
    signatureToken?: string;
    resolvedDeviceToken?: string;
    storedToken?: string;
    storedScopes?: string[];
    usingStoredDeviceToken?: boolean;
  };

  export type GatewayBrowserDeviceAuthPlan = {
    clientId: string;
    role: string;
    identity: {
      deviceId: string;
      publicKey: string;
      sign: (payload: string) => Promise<string>;
    } | null;
    selectedAuth: GatewayConnectAuthSelection;
    scopes: string[];
    device?: {
      id: string;
      publicKey: string;
      signature: string;
      signedAt: number;
      nonce: string;
    };
    auth?: {
      token?: string;
      bootstrapToken?: string;
      deviceToken?: string;
      password?: string;
    };
  };

  type GatewayProtocolSocket = {
    isOpen: () => boolean;
    send: (data: string) => void;
    close: (code?: number, reason?: string) => void;
  };

  type GatewayProtocolSocketHandlers = {
    open: () => void;
    message: (data: string) => void;
    close: (code: number, reason: string) => void;
    error: (error: Error) => void;
  };

  type GatewayProtocolCloseContext = {
    code: number;
    reason: string;
    connectFailure?: { error: Error };
  };

  export class GatewayProtocolClient<TPlan> {
    constructor(options: {
      createSocket: (
        handlers: GatewayProtocolSocketHandlers,
      ) => GatewayProtocolSocket;
      createRequestId: () => string;
      buildConnectPlan: (params: {
        nonce: string | null;
        challengeTs: number | null | undefined;
      }) => TPlan | Promise<TPlan>;
      buildConnectParams: (plan: TPlan) => unknown;
      onConnectPlanError?: (error: Error) => {
        closeCode: number;
        closeReason: string;
        stop?: boolean;
        error?: Error;
      };
      onConnectHello?: (hello: HelloOk, context: { plan: TPlan }) => void;
      onHello?: (hello: HelloOk) => void;
      onConnectFailure?: (
        error: Error,
        context: { plan: TPlan },
      ) => {
        closeCode: number;
        closeReason: string;
        stop?: boolean;
        error?: Error;
      };
      resolveClose: (context: GatewayProtocolCloseContext) => {
        retry: boolean;
        notify: boolean;
        pendingError?: Error;
      };
      onClose?: (context: GatewayProtocolCloseContext) => void;
      onConnectError?: (error: Error) => void;
      onEvent?: (event: EventFrame) => void;
      handshake: {
        mode: "require-challenge";
        timeoutMs: number;
      };
      reconnect: { initialMs: number; multiplier: number; maxMs: number };
      requestTimeoutMs?: number;
      shouldRetrySocketFactoryError?: (error: Error) => boolean;
    });
    get connected(): boolean;
    start(): void;
    stop(): void;
    request<T>(method: string, params?: unknown): Promise<T>;
  }

  export function selectGatewayConnectAuth(params: {
    token?: string;
    password?: string;
    storedToken?: string;
    storedScopes?: string[];
  }): GatewayConnectAuthSelection;

  export function buildGatewayConnectAuth(
    selected: GatewayConnectAuthSelection,
  ): GatewayBrowserDeviceAuthPlan["auth"];

  export function resolveGatewayConnectScopes(params: {
    requestedScopes?: string[];
    usingStoredDeviceToken?: boolean;
    storedScopes?: string[];
    defaultScopes: readonly string[];
  }): string[];

  export function buildDeviceAuthPayloadV3(params: {
    deviceId: string;
    clientId: string;
    clientMode: string;
    role: string;
    scopes: string[];
    signedAtMs: number;
    token: string | null;
    nonce: string;
    platform?: string;
    deviceFamily?: string;
  }): string;
}

declare module "@openclaw/gateway-protocol/version" {
  export const MIN_CLIENT_PROTOCOL_VERSION: number;
  export const PROTOCOL_VERSION: number;
}
