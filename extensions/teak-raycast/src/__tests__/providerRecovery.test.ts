import { afterEach, expect, mock, test } from "bun:test";
import { createRaycastApiMock } from "./raycastApiMock";
const getPreferenceValuesMock = mock(() => ({ apiKey: "" }));
const authorizeMock = mock(() => Promise.resolve("old-access"));
mock.module("@raycast/api", () =>
  createRaycastApiMock(false, {
    getPreferenceValues: getPreferenceValuesMock,
    oauthClient: class {
      getTokens() {
        return Promise.resolve(undefined);
      }
      removeTokens() {
        return Promise.resolve();
      }
      setTokens() {
        return Promise.resolve();
      }
      authorizationRequest() {
        return Promise.resolve({
          codeVerifier: "verifier",
          redirectURI: "https://raycast.com/redirect",
        });
      }
      async authorize() {
        return { authorizationCode: await authorizeMock() };
      }
    },
  }),
);
const { searchCards } = await import("../lib/api");
const createCardsResponse = (status = 200) =>
  Response.json(
    status === 401
      ? {}
      : { items: [], pageInfo: { hasMore: false, nextCursor: null } },
    { status },
  );
const withDiscovery = (
  transport: typeof fetch,
  provider = () => "betterauth",
): typeof fetch =>
  ((input, init) => {
    const url = String(input);
    const mode = provider();
    const issuer =
      mode === "workos"
        ? "https://api.workos.com"
        : "https://app.teakvault.com";
    let metadata: unknown;
    if (url.includes("oauth-protected-resource")) {
      metadata = {
        resource: "https://teakvault.com/mcp",
        authorization_servers: [issuer],
      };
    } else if (url.includes("teak-oauth-clients")) {
      metadata = {
        primary: mode,
        issuer,
        clients: Object.fromEntries(
          ["cli", "raycast", "chrome", "firefox", "safari"].map((surface) => [
            surface,
            mode === "workos" ? "client_raycast_workos" : "teak-raycast",
          ]),
        ),
      };
    } else if (url.includes("oauth-authorization-server")) {
      metadata = {
        issuer,
        code_challenge_methods_supported: ["S256"],
        authorization_endpoint: `${issuer}/authorize`,
        token_endpoint: `${issuer}/token`,
        revocation_endpoint: "https://teakvault.com/api/api/oauth/revoke",
      };
    } else if (url.endsWith("/token")) {
      return Promise.resolve(
        Response.json({
          access_token: new URLSearchParams(String(init?.body)).get("code"),
          refresh_token: "refresh",
          expires_in: 300,
        }),
      );
    }
    return metadata
      ? Promise.resolve(Response.json(metadata))
      : transport(input, init);
  }) as typeof fetch;
const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});
test("a401 provider flip reauthorizes with the newly discovered issuer", async () => {
  getPreferenceValuesMock.mockImplementation(() => ({ apiKey: "" }));
  let mode = "betterauth";
  const exchanges: Array<{ url: string; body: URLSearchParams }> = [];
  const seenTokens: string[] = [];
  const discovered = withDiscovery(
    mock((_input: RequestInfo | URL, init?: RequestInit) => {
      seenTokens.push(new Headers(init?.headers).get("authorization") ?? "");
      if (mode === "betterauth") {
        mode = "workos";
        return createCardsResponse(401);
      }
      return createCardsResponse();
    }) as unknown as typeof fetch,
    () => mode,
  );
  globalThis.fetch = ((input, init) => {
    if (String(input).endsWith("/token")) {
      exchanges.push({
        url: String(input),
        body: new URLSearchParams(String(init?.body)),
      });
    }
    return discovered(input, init);
  }) as typeof fetch;
  authorizeMock
    .mockImplementationOnce(() => Promise.resolve("old-access"))
    .mockImplementationOnce(() => Promise.resolve("new-access"));
  await searchCards({ limit: 1 });
  expect(exchanges.map(({ url }) => url)).toEqual([
    "https://app.teakvault.com/token",
    "https://api.workos.com/token",
  ]);
  expect(exchanges[1].body.get("client_id")).toBe("client_raycast_workos");
  expect(exchanges[1].body.get("resource")).toBe("https://teakvault.com/api");
  expect(seenTokens).toEqual(["Bearer old-access", "Bearer new-access"]);
});
