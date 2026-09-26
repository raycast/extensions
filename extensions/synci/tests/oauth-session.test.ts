import { describe, expect, it, vi } from "vitest";
import { OAuthSession, SignInRequiredError, type OAuthAdapter, type StoredTokens } from "../src/lib/oauth-session";

function setup(stored?: StoredTokens) {
  const adapter = {
    getTokens: vi.fn<OAuthAdapter["getTokens"]>().mockResolvedValue(stored),
    setTokens: vi.fn<OAuthAdapter["setTokens"]>().mockResolvedValue(),
    removeTokens: vi.fn<OAuthAdapter["removeTokens"]>().mockResolvedValue(),
    authorize: vi.fn<OAuthAdapter["authorize"]>().mockResolvedValue({
      code: "code",
      verifier: "verifier",
      redirect: "https://raycast.com/redirect?packageName=Extension",
    }),
  };
  const transport = vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json({ access_token: "new-access", refresh_token: "new-refresh", expires_in: 3600 }));
  return {
    adapter,
    transport,
    session: new OAuthSession(adapter, "public-client", "https://api.synci.io/oauth/token", transport),
  };
}
const expired = { accessToken: "old-access", refreshToken: "old-refresh", isExpired: () => true };

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

describe("OAuth PKCE", () => {
  it("exchanges the authorization code with form encoding and no client secret", async () => {
    const { session, adapter, transport } = setup();
    expect(await session.accessToken(true)).toBe("new-access");
    const params = transport.mock.calls[0][1]?.body as URLSearchParams;
    expect(params.get("grant_type")).toBe("authorization_code");
    expect(params.get("code_verifier")).toBe("verifier");
    expect(params.get("redirect_uri")).toBe("https://raycast.com/redirect?packageName=Extension");
    expect(params.has("client_secret")).toBe(false);
    expect(adapter.setTokens).toHaveBeenCalledWith(expect.objectContaining({ refresh_token: "new-refresh" }));
  });
  it("reuses valid stored credentials without network calls", async () => {
    const { session, adapter, transport } = setup({ ...expired, isExpired: () => false });
    expect(await session.accessToken()).toBe("old-access");
    expect(transport).not.toHaveBeenCalled();
    expect(adapter.authorize).not.toHaveBeenCalled();
  });
  it("requests fresh consent even when the existing access token is valid", async () => {
    const { session, adapter, transport } = setup({ ...expired, isExpired: () => false });
    expect(await session.reconnect()).toBe("new-access");
    expect(adapter.authorize).toHaveBeenCalledWith(true);
    const params = transport.mock.calls[0][1]?.body as URLSearchParams;
    expect(params.get("grant_type")).toBe("authorization_code");
    expect(adapter.removeTokens).not.toHaveBeenCalled();
    expect(adapter.setTokens).toHaveBeenCalledOnce();
  });
  it("keeps the existing session if the user cancels reconnecting", async () => {
    const { session, adapter, transport } = setup({ ...expired, isExpired: () => false });
    adapter.authorize.mockRejectedValue(new Error("Authorization canceled"));
    await expect(session.reconnect()).rejects.toThrow("canceled");
    expect(await session.accessToken()).toBe("old-access");
    expect(adapter.removeTokens).not.toHaveBeenCalled();
    expect(adapter.setTokens).not.toHaveBeenCalled();
    expect(transport).not.toHaveBeenCalled();
  });
  it.each([429, 503])("keeps the existing session if reconnect exchange fails with HTTP %s", async (status) => {
    const { session, adapter, transport } = setup({ ...expired, isExpired: () => false });
    transport.mockResolvedValue(new Response("temporary", { status }));
    await expect(session.reconnect()).rejects.toThrow();
    expect(await session.accessToken()).toBe("old-access");
    expect(adapter.removeTokens).not.toHaveBeenCalled();
    expect(adapter.setTokens).not.toHaveBeenCalled();
  });
  it("shares a reconnect across concurrent calls and waiting data requests", async () => {
    const { session, adapter, transport } = setup({ ...expired, isExpired: () => false });
    expect(await Promise.all([session.reconnect(), session.reconnect(), session.accessToken()])).toEqual([
      "new-access",
      "new-access",
      "new-access",
    ]);
    expect(adapter.authorize).toHaveBeenCalledOnce();
    expect(transport).toHaveBeenCalledOnce();
  });
  it("does not exchange a reconnect code after the user signs out", async () => {
    const { session, adapter, transport } = setup({ ...expired, isExpired: () => false });
    let finishConsent: (value: Awaited<ReturnType<OAuthAdapter["authorize"]>>) => void = () => {};
    adapter.authorize.mockImplementation(
      () =>
        new Promise((done) => {
          finishConsent = done;
        }),
    );
    const reconnect = session.reconnect();
    await vi.waitFor(() => expect(adapter.authorize).toHaveBeenCalled());
    await session.disconnect();
    finishConsent({ code: "late", verifier: "verifier", redirect: "https://raycast.com/redirect" });
    await expect(reconnect).rejects.toBeInstanceOf(SignInRequiredError);
    expect(adapter.setTokens).not.toHaveBeenCalled();
    expect(transport).not.toHaveBeenCalled();
  });
  it("finishes an in-flight refresh before replacing the grant with fresh consent", async () => {
    const { session, adapter, transport } = setup(expired);
    let finishRefresh: (value: Response) => void = () => {};
    transport.mockImplementationOnce(
      () =>
        new Promise((done) => {
          finishRefresh = done;
        }),
    );
    const refresh = session.accessToken();
    await vi.waitFor(() => expect(transport).toHaveBeenCalled());
    const reconnect = session.reconnect();
    expect(adapter.authorize).not.toHaveBeenCalled();
    finishRefresh(Response.json({ access_token: "rotated", refresh_token: "rotated-refresh", expires_in: 3600 }));
    expect(await refresh).toBe("rotated");
    expect(await reconnect).toBe("new-access");
    expect(adapter.setTokens).toHaveBeenNthCalledWith(1, expect.objectContaining({ access_token: "rotated" }));
    expect(adapter.setTokens).toHaveBeenNthCalledWith(2, expect.objectContaining({ access_token: "new-access" }));
    expect(adapter.removeTokens).not.toHaveBeenCalled();
  });
  it("does not reuse a previous grant's refresh token after reconnecting", async () => {
    const { session, adapter, transport } = setup(expired);
    transport.mockResolvedValue(Response.json({ access_token: "new-access", expires_in: 3600 }));
    await session.reconnect();
    expect(adapter.setTokens).toHaveBeenCalledWith({
      access_token: "new-access",
      expires_in: 3600,
      refresh_token: undefined,
    });
  });
  it("rotates refresh tokens exactly once for concurrent calls", async () => {
    const { session, adapter, transport } = setup(expired);
    expect(await Promise.all([session.accessToken(), session.accessToken()])).toEqual(["new-access", "new-access"]);
    expect(transport).toHaveBeenCalledTimes(1);
    expect(adapter.setTokens).toHaveBeenCalledWith(expect.objectContaining({ refresh_token: "new-refresh" }));
  });
  it.each([429, 500, 503])("preserves the session when token refresh fails with HTTP %s", async (status) => {
    const { session, adapter, transport } = setup(expired);
    transport.mockResolvedValue(new Response("temporary", { status }));
    await expect(session.accessToken()).rejects.toThrow();
    expect(adapter.removeTokens).not.toHaveBeenCalled();
    expect(adapter.authorize).not.toHaveBeenCalled();
  });
  it("requires explicit sign-in after revoked refresh credentials", async () => {
    const { session, adapter, transport } = setup(expired);
    transport.mockResolvedValue(Response.json({ error: "invalid_grant" }, { status: 400 }));
    await expect(session.accessToken()).rejects.toBeInstanceOf(SignInRequiredError);
    expect(adapter.removeTokens).toHaveBeenCalledOnce();
    expect(adapter.authorize).not.toHaveBeenCalled();
  });
  it("never launches a browser from a data request when signed out", async () => {
    const { session, adapter } = setup();
    await expect(session.accessToken()).rejects.toBeInstanceOf(SignInRequiredError);
    expect(adapter.authorize).not.toHaveBeenCalled();
  });
  it("does not restore tokens after a sign-out during refresh", async () => {
    const { session, adapter, transport } = setup(expired);
    let resolve: (value: Response) => void = () => {};
    transport.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const request = session.accessToken();
    await vi.waitFor(() => expect(transport).toHaveBeenCalled());
    await session.disconnect();
    resolve(Response.json({ access_token: "late", refresh_token: "late", expires_in: 3600 }));
    await expect(request).rejects.toBeInstanceOf(SignInRequiredError);
    expect(adapter.setTokens).not.toHaveBeenCalled();
  });
  it.each(["refresh", "sign-in", "reconnect"])(
    "keeps credentials removed when sign-out overlaps a pending %s token write",
    async (flow) => {
      const { session, adapter } = setup();
      let persisted: StoredTokens | undefined = flow === "sign-in" ? undefined : expired;
      const writeStarted = deferred<void>();
      const finishWrite = deferred<void>();
      adapter.getTokens.mockImplementation(async () => persisted);
      adapter.setTokens.mockImplementation(async (tokens) => {
        writeStarted.resolve();
        await finishWrite.promise;
        persisted = { accessToken: tokens.access_token, isExpired: () => false };
      });
      adapter.removeTokens.mockImplementation(async () => {
        persisted = undefined;
      });

      const request = flow === "reconnect" ? session.reconnect() : session.accessToken(flow === "sign-in");
      const rejected = expect(request).rejects.toBeInstanceOf(SignInRequiredError);
      await writeStarted.promise;
      const disconnect = session.disconnect();
      finishWrite.resolve();
      await Promise.all([rejected, disconnect]);

      expect(persisted).toBeUndefined();
      await expect(session.accessToken()).rejects.toBeInstanceOf(SignInRequiredError);
    },
  );
  it("still removes credentials if a pending token write fails during sign-out", async () => {
    const { session, adapter } = setup(expired);
    const writeStarted = deferred<void>();
    const finishWrite = deferred<void>();
    adapter.setTokens.mockImplementation(() => {
      writeStarted.resolve();
      return finishWrite.promise;
    });
    const request = session.accessToken();
    const rejected = expect(request).rejects.toThrow("Could not save tokens");
    await writeStarted.promise;
    const disconnect = session.disconnect();
    finishWrite.reject(new Error("Could not save tokens"));
    await Promise.all([rejected, disconnect]);
    expect(adapter.removeTokens).toHaveBeenCalledOnce();
  });
  it("does not return credentials from a token read that finishes after sign-out", async () => {
    const { session, adapter, transport } = setup();
    const readStarted = deferred<void>();
    const finishRead = deferred<StoredTokens>();
    adapter.getTokens.mockImplementation(() => {
      readStarted.resolve();
      return finishRead.promise;
    });
    const request = session.accessToken();
    const rejected = expect(request).rejects.toBeInstanceOf(SignInRequiredError);
    await readStarted.promise;
    await session.disconnect();
    finishRead.resolve({ ...expired, isExpired: () => false });
    await rejected;
    expect(transport).not.toHaveBeenCalled();
  });
  it("preserves a fresh sign-in started while the previous sign-out is finishing", async () => {
    const { session, adapter, transport } = setup();
    let persisted: StoredTokens | undefined = { ...expired, isExpired: () => false };
    const removalStarted = deferred<void>();
    const finishRemoval = deferred<void>();
    adapter.getTokens.mockImplementation(async () => persisted);
    adapter.setTokens.mockImplementation(async (tokens) => {
      persisted = { accessToken: tokens.access_token, isExpired: () => false };
    });
    adapter.removeTokens.mockImplementation(async () => {
      removalStarted.resolve();
      await finishRemoval.promise;
      persisted = undefined;
    });

    const disconnect = session.disconnect();
    await removalStarted.promise;
    const reconnect = session.reconnect();
    await vi.waitFor(() => expect(transport).toHaveBeenCalled());
    finishRemoval.resolve();
    await disconnect;
    expect(await reconnect).toBe("new-access");
    expect(await session.accessToken()).toBe("new-access");
  });
  it("rejects malformed tokens instead of persisting them", async () => {
    const { session, adapter, transport } = setup();
    transport.mockResolvedValue(Response.json({ access_token: "", expires_in: 3600 }));
    await expect(session.accessToken(true)).rejects.toThrow("invalid token");
    expect(adapter.setTokens).not.toHaveBeenCalled();
  });
});
