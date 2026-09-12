import { beforeEach, describe, expect, it, vi } from "vitest";

type MockTokenSet = {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  updatedAt: Date;
  isExpired: () => boolean;
};

type MockTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
};

function makeJwt(payload: object): string {
  return `header.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.sig`;
}

function makeTokenSet(args: {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  updatedAt?: Date;
  expired?: boolean;
}): MockTokenSet {
  const updatedAt = args.updatedAt ?? new Date();
  return {
    accessToken: args.accessToken,
    refreshToken: args.refreshToken,
    expiresIn: args.expiresIn,
    updatedAt,
    isExpired: () => Boolean(args.expired),
  };
}

const localStorageState = new Map<string, string>();
const showToast = vi.fn();
const clearSecureDeviceData = vi.fn();
const fetchWithTimeout = vi.fn();
const getExtensionConfig = vi.fn(() => ({
  authBridgeUrl: "https://auth.nibit.app",
  supabaseUrl: "https://jzaibypvgxaheswvyjng.supabase.co",
  supabaseAnonKey: "anon",
  appBaseUrl: "https://app.nibit.app",
  blobRelayUrl: "https://blob-relay.nibit.app",
}));

class MockPKCEClient {
  static instance: MockPKCEClient | null = null;
  static instances: MockPKCEClient[] = [];
  tokens: MockTokenSet | null = null;
  setTokens = vi.fn(async (tokens: MockTokenSet | MockTokenResponse | null) => {
    if (tokens && "access_token" in tokens) {
      this.tokens = makeTokenSet({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
        updatedAt: new Date(),
        expired: false,
      });
      return;
    }
    this.tokens = tokens;
  });
  getTokens = vi.fn(async () => this.tokens);
  removeTokens = vi.fn(async () => {
    this.tokens = null;
  });
  authorizationRequest = vi.fn();
  authorize = vi.fn();

  constructor() {
    MockPKCEClient.instances.push(this);
    MockPKCEClient.instance = this;
  }
}

vi.mock("@raycast/api", () => ({
  LocalStorage: {
    async getItem<T extends string>(key: string): Promise<T | undefined> {
      return localStorageState.get(key) as T | undefined;
    },
    async setItem(key: string, value: string): Promise<void> {
      localStorageState.set(key, value);
    },
    async removeItem(key: string): Promise<void> {
      localStorageState.delete(key);
    },
  },
  environment: {
    supportPath: "",
  },
  OAuth: {
    RedirectMethod: { Web: "web" },
    PKCEClient: MockPKCEClient,
  },
  Toast: { Style: { Failure: "failure" } },
  showToast,
}));

vi.mock("./client", () => ({
  clearSecureDeviceData,
}));

vi.mock("./fetch", () => ({
  fetchWithTimeout,
}));

vi.mock("./config", () => ({
  getExtensionConfig,
}));

describe("oauth session management", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    localStorageState.clear();
    MockPKCEClient.instance = null;
    MockPKCEClient.instances = [];
  });

  it("returns a session from fresh stored tokens without refreshing", async () => {
    const accessToken = makeJwt({ sub: "user-1", email: "user@nibit.app", exp: Math.floor(Date.now() / 1000) + 3600 });
    await import("./oauth");
    MockPKCEClient.instance!.tokens = makeTokenSet({
      accessToken,
      refreshToken: "refresh-1",
      expiresIn: 3600,
      expired: false,
    });

    const { getAuthSession } = await import("./oauth");
    const session = await getAuthSession();

    expect(session).toEqual({
      userId: "user-1",
      accessToken,
      refreshToken: "refresh-1",
      expiresAt: expect.any(Number),
      authType: "supabase",
    });
    expect(fetchWithTimeout).not.toHaveBeenCalled();
  });

  it("refreshes expired tokens and persists the rotated token pair", async () => {
    const oldAccessToken = makeJwt({ sub: "user-1", email: "user@nibit.app", exp: Math.floor(Date.now() / 1000) - 60 });
    const newAccessToken = makeJwt({
      sub: "user-1",
      email: "user@nibit.app",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    fetchWithTimeout.mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: newAccessToken,
        refresh_token: "refresh-2",
        expires_in: 3600,
      }),
    });

    await import("./oauth");
    MockPKCEClient.instance!.tokens = makeTokenSet({
      accessToken: oldAccessToken,
      refreshToken: "refresh-1",
      expiresIn: 3600,
      expired: true,
    });

    const { getAuthSession } = await import("./oauth");
    const session = await getAuthSession();

    expect(fetchWithTimeout).toHaveBeenCalledTimes(1);
    expect(MockPKCEClient.instance!.setTokens).toHaveBeenCalled();
    expect(session).toEqual({
      userId: "user-1",
      accessToken: newAccessToken,
      refreshToken: "refresh-2",
      expiresAt: expect.any(Number),
      authType: "supabase",
    });
  });

  it("returns null on terminal refresh failures without clearing device data", async () => {
    const expiredToken = makeJwt({ sub: "user-1", email: "user@nibit.app", exp: Math.floor(Date.now() / 1000) - 60 });

    fetchWithTimeout.mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ error_code: "refresh_token_not_found" }),
    });

    await import("./oauth");
    MockPKCEClient.instance!.tokens = makeTokenSet({
      accessToken: expiredToken,
      refreshToken: "refresh-1",
      expiresIn: 3600,
      expired: true,
    });

    const { getAuthSession } = await import("./oauth");
    const session = await getAuthSession();

    expect(session).toBeNull();
    expect(clearSecureDeviceData).not.toHaveBeenCalled();
  });

  it("signInWithNibit exchanges the auth code and stores the generated API key", async () => {
    await import("./oauth");
    const client = MockPKCEClient.instance!;
    client.authorizationRequest.mockResolvedValue({
      redirectURI: "https://raycast.com/redirect",
      codeVerifier: "verifier-xyz",
    });
    client.authorize.mockResolvedValue({ authorizationCode: "code-abc" });
    fetchWithTimeout.mockResolvedValue({
      ok: true,
      json: async () => ({
        token_type: "api_key",
        user_id: "user-42",
        api_key: "nb_live_public_secret",
        api_key_id: "key-1",
        api_key_prefix: "nb_live_public",
      }),
    });

    const { signInWithNibit } = await import("./oauth");
    const session = await signInWithNibit();

    expect(client.setTokens).not.toHaveBeenCalled();
    expect(session).toEqual({
      userId: "user-42",
      accessToken: "nb_live_public_secret",
      refreshToken: null,
      expiresAt: null,
      authType: "api_key",
    });
    const generatedApiKeyClient = MockPKCEClient.instances[0];
    expect(generatedApiKeyClient.setTokens).toHaveBeenCalledWith({ accessToken: "nb_live_public_secret" });
    expect(localStorageState.get("auth:generated-api-key")).toBeUndefined();
    expect(JSON.parse(localStorageState.get("auth:generated-api-key-meta") ?? "{}")).toEqual({
      userId: "user-42",
      apiKeyId: "key-1",
      apiKeyPrefix: "nb_live_public",
      platform: "raycast",
      createdAt: expect.any(String),
    });
  });

  it("non-terminal network failure falls back to the still-live proactive token without clearing session", async () => {
    // JWT expires in 30s — within the 60s proactive buffer, so refresh is attempted.
    // isExpired() returns false — token is not officially past its OAuth expiry.
    // A transient network error should not sign the user out or wipe stored tokens.
    const accessToken = makeJwt({ sub: "user-1", exp: Math.floor(Date.now() / 1000) + 30 });

    fetchWithTimeout.mockRejectedValue(new Error("Network timeout"));

    await import("./oauth");
    MockPKCEClient.instance!.tokens = makeTokenSet({
      accessToken,
      refreshToken: "refresh-1",
      expiresIn: 3600,
      expired: false, // not officially expired — proactive 60s buffer triggers the attempt
    });

    const { getAuthSession } = await import("./oauth");
    const session = await getAuthSession();

    expect(session).not.toBeNull();
    expect(session?.accessToken).toBe(accessToken);
    expect(clearSecureDeviceData).not.toHaveBeenCalled();
  });

  it("clears malformed stored auth without recursively re-entering session validation", async () => {
    await import("./oauth");
    MockPKCEClient.instance!.tokens = makeTokenSet({
      accessToken: "malformed-token",
      refreshToken: "refresh-1",
      expiresIn: 3600,
      expired: false,
    });

    const { getAuthSession } = await import("./oauth");
    const session = await getAuthSession();

    expect(session).toBeNull();
    expect(MockPKCEClient.instance!.removeTokens).toHaveBeenCalledOnce();
    expect(clearSecureDeviceData).toHaveBeenCalledWith({ deactivateSession: null });
  });

  it("sign-out clears tokens and device data", async () => {
    const accessToken = makeJwt({ sub: "user-1", exp: Math.floor(Date.now() / 1000) + 3600 });

    await import("./oauth");
    MockPKCEClient.instance!.tokens = makeTokenSet({
      accessToken,
      refreshToken: "refresh-1",
      expiresIn: 3600,
      expired: false,
    });

    const { clearAuthSession, getAuthSession } = await import("./oauth");

    const before = await getAuthSession();
    expect(before).not.toBeNull();

    await clearAuthSession();

    expect(MockPKCEClient.instance!.removeTokens).toHaveBeenCalledOnce();
    expect(clearSecureDeviceData).toHaveBeenCalledWith({ deactivateSession: before });

    const after = await getAuthSession();
    expect(after).toBeNull();
  });

  it("concurrent refresh callers share a single refresh call via the lock", async () => {
    const oldAccessToken = makeJwt({ sub: "user-1", exp: Math.floor(Date.now() / 1000) - 60 });
    const newAccessToken = makeJwt({ sub: "user-1", exp: Math.floor(Date.now() / 1000) + 3600 });

    fetchWithTimeout.mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: newAccessToken, refresh_token: "refresh-2", expires_in: 3600 }),
    });

    await import("./oauth");
    MockPKCEClient.instance!.tokens = makeTokenSet({
      accessToken: oldAccessToken,
      refreshToken: "refresh-1",
      expiresIn: 3600,
      expired: true,
    });

    const { getAuthSession } = await import("./oauth");
    const [session1, session2] = await Promise.all([getAuthSession(), getAuthSession()]);

    // Only one network refresh call despite two concurrent callers
    expect(fetchWithTimeout).toHaveBeenCalledTimes(1);
    expect(session1?.accessToken).toBe(newAccessToken);
    expect(session2?.accessToken).toBe(newAccessToken);
  }, 5_000);
});
