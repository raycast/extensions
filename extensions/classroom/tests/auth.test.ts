import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  prefs: { clientId: "test-client", role: "student" },
  getTokens: vi.fn(),
  setTokens: vi.fn(),
  removeTokens: vi.fn(),
  authorizationRequest: vi.fn(),
  authorize: vi.fn(),
  options: vi.fn(),
  fetcher: vi.fn(),
}));
vi.mock("@raycast/api", () => ({
  getPreferenceValues: () => state.prefs,
  OAuth: {
    RedirectMethod: { AppURI: "app-uri" },
    PKCEClient: class {
      constructor(options: unknown) {
        state.options(options);
      }
      getTokens = state.getTokens;
      setTokens = state.setTokens;
      removeTokens = state.removeTokens;
      authorizationRequest = state.authorizationRequest;
      authorize = state.authorize;
    },
  },
}));
import { accessToken, reconnect, scopesForRole } from "../src/lib/auth";

const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });
const saved = (scope: unknown = scopesForRole("student"), expired = false) => ({
  accessToken: "saved-access",
  refreshToken: "saved-refresh",
  scope,
  isExpired: () => expired,
});
const grant = (scope: unknown = scopesForRole("student")) => ({
  access_token: "new-access",
  refresh_token: "new-refresh",
  expires_in: 3600,
  scope,
});

beforeEach(() => {
  vi.clearAllMocks();
  state.prefs = { clientId: "test-client", role: "student" };
  state.getTokens.mockResolvedValue(undefined);
  state.authorizationRequest.mockResolvedValue({
    codeVerifier: "test-verifier",
    redirectURI: "com.raycast:/oauth?package_name=classroom",
  });
  state.authorize.mockResolvedValue({ authorizationCode: "test-code" });
  state.fetcher.mockResolvedValue(response(grant()));
  vi.stubGlobal("fetch", state.fetcher);
});

describe("Classroom authorization", () => {
  it("uses only student read-only scopes by default", () => {
    expect(scopesForRole("student").split(" ")).toEqual([
      "https://www.googleapis.com/auth/classroom.courses.readonly",
      "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
    ]);
    expect(scopesForRole("teacher")).toContain(
      "classroom.coursework.students.readonly",
    );
  });
  it("does not silently initiate browser login from a browse command", async () => {
    await expect(accessToken()).rejects.toThrow("Run Connect");
    expect(state.authorize).not.toHaveBeenCalled();
  });
  it("keeps a valid stored token with confirmed scopes without network calls", async () => {
    state.getTokens.mockResolvedValue(saved());
    expect(await accessToken()).toBe("saved-access");
    expect(state.fetcher).not.toHaveBeenCalled();
  });
  it("preserves the saved refresh token and confirmed scope when Google omits them on refresh", async () => {
    state.getTokens.mockResolvedValue(saved(scopesForRole("student"), true));
    state.fetcher.mockResolvedValue(
      response({ access_token: "refreshed-access", expires_in: 3600 }),
    );
    expect(await accessToken()).toBe("refreshed-access");
    expect(state.setTokens).toHaveBeenCalledWith(
      expect.objectContaining({
        refresh_token: "saved-refresh",
        scope: scopesForRole("student"),
      }),
    );
    expect(state.fetcher.mock.calls[0][1].body.get("grant_type")).toBe(
      "refresh_token",
    );
  });
  it("exchanges the authorization code with PKCE code_verifier and no client secret", async () => {
    expect(await reconnect()).toBe("new-access");
    const request = state.fetcher.mock.calls[0][1];
    expect(request.body.get("code_verifier")).toBe("test-verifier");
    expect(request.body.get("client_secret")).toBeNull();
    expect(state.authorizationRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        extraParameters: { access_type: "offline", prompt: "consent" },
      }),
    );
    expect(state.setTokens).toHaveBeenCalledWith(
      expect.objectContaining({
        access_token: "new-access",
        scope: scopesForRole("student"),
      }),
    );
  });
  it("forces fresh consent for Connect even if a valid token is already stored", async () => {
    state.getTokens.mockResolvedValue(saved());
    expect(await reconnect()).toBe("new-access");
    expect(state.authorize).toHaveBeenCalledOnce();
    expect(state.getTokens).not.toHaveBeenCalled();
    expect(state.removeTokens).not.toHaveBeenCalled();
  });
  it("retains a working connection when replacement consent is cancelled", async () => {
    state.getTokens.mockResolvedValue(saved());
    state.authorize.mockRejectedValueOnce(new Error("Consent cancelled"));
    await expect(reconnect()).rejects.toThrow("cancelled");
    expect(state.setTokens).not.toHaveBeenCalled();
    expect(state.removeTokens).not.toHaveBeenCalled();
    expect(state.fetcher).not.toHaveBeenCalled();
    expect(await accessToken()).toBe("saved-access");
  });
  it("retains a working connection after a transient authorization exchange failure", async () => {
    state.getTokens.mockResolvedValue(saved());
    state.fetcher.mockRejectedValueOnce(new Error("Network unavailable"));
    await expect(reconnect()).rejects.toThrow("Network unavailable");
    expect(state.setTokens).not.toHaveBeenCalled();
    expect(state.removeTokens).not.toHaveBeenCalled();
    expect(await accessToken()).toBe("saved-access");
  });
  it("rejects partial consent without replacing the previously working connection", async () => {
    state.getTokens.mockResolvedValue(saved());
    state.fetcher.mockResolvedValue(
      response(
        grant("https://www.googleapis.com/auth/classroom.courses.readonly"),
      ),
    );
    await expect(reconnect()).rejects.toThrow(
      "both required read-only permissions",
    );
    expect(state.setTokens).not.toHaveBeenCalled();
    expect(state.removeTokens).not.toHaveBeenCalled();
    expect(await accessToken()).toBe("saved-access");
  });
  it("rejects a new grant with missing scope instead of inventing the requested grant", async () => {
    const tokens = grant();
    delete (tokens as Partial<typeof tokens>).scope;
    state.fetcher.mockResolvedValue(response(tokens));
    await expect(reconnect()).rejects.toThrow(
      "no scope was returned or stored",
    );
    expect(state.setTokens).not.toHaveBeenCalled();
  });
  it.each([
    null,
    123,
    "",
    [],
    [""],
    ["valid", 123],
    "scope\nother",
    ["scope other"],
  ])("rejects malformed new scope data: %j", async (scope) => {
    state.fetcher.mockResolvedValue(response(grant(scope)));
    await expect(reconnect()).rejects.toThrow("malformed");
    expect(state.setTokens).not.toHaveBeenCalled();
  });
  it("accepts Raycast's documented scope array representation and stores confirmed string scopes", async () => {
    state.fetcher.mockResolvedValue(
      response(grant(scopesForRole("student").split(" "))),
    );
    expect(await reconnect()).toBe("new-access");
    expect(state.setTokens).toHaveBeenCalledWith(
      expect.objectContaining({ scope: scopesForRole("student") }),
    );
  });
  it.each([
    [undefined, "no scope was returned or stored"],
    [null, "malformed"],
    [
      "https://www.googleapis.com/auth/classroom.courses.readonly",
      "both required read-only permissions",
    ],
  ])(
    "does not use or refresh a saved token with unconfirmed permissions: %j",
    async (scope, message) => {
      state.getTokens.mockResolvedValue({ ...saved(), scope });
      await expect(accessToken()).rejects.toThrow(message as string);
      expect(state.fetcher).not.toHaveBeenCalled();
      expect(state.authorize).not.toHaveBeenCalled();
      expect(state.setTokens).not.toHaveBeenCalled();
    },
  );
  it.each([
    [null, "malformed"],
    [
      "https://www.googleapis.com/auth/classroom.courses.readonly",
      "both required read-only permissions",
    ],
  ])(
    "rejects explicitly malformed or narrowed refresh scope without replacing stored tokens: %j",
    async (scope, message) => {
      state.getTokens.mockResolvedValue(saved(scopesForRole("student"), true));
      state.fetcher.mockResolvedValue(
        response({ access_token: "refreshed-access", scope }),
      );
      await expect(accessToken()).rejects.toThrow(message as string);
      expect(state.setTokens).not.toHaveBeenCalled();
      expect(state.removeTokens).not.toHaveBeenCalled();
    },
  );
  it("keeps a refresh token after a transient refresh error so the next browse can retry", async () => {
    state.getTokens.mockResolvedValue(saved(scopesForRole("student"), true));
    state.fetcher.mockRejectedValueOnce(new Error("Network unavailable"));
    await expect(accessToken()).rejects.toThrow("Network unavailable");
    expect(state.setTokens).not.toHaveBeenCalled();
    expect(state.removeTokens).not.toHaveBeenCalled();
    expect(await accessToken()).toBe("new-access");
    expect(state.fetcher.mock.calls[1][1].body.get("refresh_token")).toBe(
      "saved-refresh",
    );
  });
  it("does not accept a student coursework grant for teacher mode", async () => {
    state.prefs.role = "teacher";
    await expect(reconnect()).rejects.toThrow("selected role");
    expect(state.setTokens).not.toHaveBeenCalled();
  });
  it("partitions stored tokens by OAuth client and role", async () => {
    await expect(accessToken()).rejects.toThrow();
    state.prefs.role = "teacher";
    await expect(accessToken()).rejects.toThrow();
    expect(state.options.mock.calls[0][0].providerId).not.toBe(
      state.options.mock.calls[1][0].providerId,
    );
  });
  it("fails with concrete setup guidance before opening OAuth", async () => {
    state.prefs.clientId = "";
    await expect(reconnect()).rejects.toThrow("client ID");
    expect(state.authorize).not.toHaveBeenCalled();
  });
  it("does not expose a failed exchange's response body or erase the old connection", async () => {
    state.getTokens.mockResolvedValue(saved());
    state.fetcher.mockResolvedValue(
      response({ sensitive: "private-provider-body" }, 400),
    );
    await expect(reconnect()).rejects.toThrow("Google sign-in failed (400)");
    await expect(reconnect()).rejects.not.toThrow("private-provider-body");
    expect(state.setTokens).not.toHaveBeenCalled();
    expect(await accessToken()).toBe("saved-access");
  });
  it("sanitizes malformed JSON exchange responses without accepting an unconfirmed token", async () => {
    state.fetcher.mockResolvedValue(new Response("private-provider-body"));
    await expect(reconnect()).rejects.toThrow("unexpected sign-in response");
    expect(state.setTokens).not.toHaveBeenCalled();
  });
});
