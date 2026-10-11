import { afterEach, expect, mock, test } from "bun:test";
import { createRaycastApiMock } from "./raycastApiMock";

const getPreferenceValuesMock = mock(() => ({ apiKey: "" }));
let savedToken: string | undefined;
const authorizeMock = mock(() => Promise.resolve("old-access"));
mock.module("@raycast/api", () =>
  createRaycastApiMock(false, {
    getPreferenceValues: getPreferenceValuesMock,
    oauthClient: class {
      getTokens() {
        return Promise.resolve(
          savedToken
            ? { accessToken: savedToken, isExpired: () => false }
            : undefined,
        );
      }
      removeTokens() {
        return Promise.resolve();
      }
      setTokens() {
        return Promise.resolve();
      }
      authorizationRequest() {
        return Promise.resolve({
          codeChallenge: "challenge",
          codeVerifier: "verifier",
          redirectURI: "https://raycast.com/redirect",
          state: "state",
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
  currentIssuer = () => "https://scholarly-hay-77.authkit.app",
): typeof fetch =>
  ((input, init) => {
    const url = String(input);
    const issuer = currentIssuer();
    let metadata: unknown;
    if (url.includes("oauth-protected-resource")) {
      metadata = {
        resource: "https://teakvault.com/mcp",
        authorization_servers: [issuer],
      };
    } else if (url.includes("teak-oauth-clients")) {
      metadata = {
        primary: "workos",
        issuer,
        clients: Object.fromEntries(
          ["cli", "raycast", "chrome", "firefox", "safari"].map((surface) => [
            surface,
            "client_01M47GV3CYKFW0H78W0XYKGTM5",
          ]),
        ),
      };
    } else if (url.includes("oauth-authorization-server")) {
      metadata = {
        issuer,
        code_challenge_methods_supported: ["S256"],
        authorization_endpoint: `${issuer}/authorize`,
        token_endpoint: `${issuer}/oauth2/token`,
      };
    } else if (url.endsWith("/oauth2/token")) {
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
test("a 401 after an issuer change reauthorizes with the newly discovered issuer", async () => {
  getPreferenceValuesMock.mockImplementation(() => ({ apiKey: "" }));
  let issuer = "https://scholarly-hay-77.authkit.app";
  const exchanges: Array<{ url: string; body: URLSearchParams }> = [];
  const seenTokens: string[] = [];
  let discoveryRounds = 0;
  const discovered = withDiscovery(
    mock((_input: RequestInfo | URL, init?: RequestInit) => {
      seenTokens.push(new Headers(init?.headers).get("authorization") ?? "");
      if (issuer === "https://scholarly-hay-77.authkit.app") {
        issuer = "https://replacement-teak.authkit.app";
        return createCardsResponse(401);
      }
      return createCardsResponse();
    }) as unknown as typeof fetch,
    () => issuer,
  );
  globalThis.fetch = ((input, init) => {
    if (String(input).includes("teak-oauth-clients")) {
      discoveryRounds++;
    }
    if (String(input).endsWith("/oauth2/token")) {
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
    "https://scholarly-hay-77.authkit.app/oauth2/token",
    "https://replacement-teak.authkit.app/oauth2/token",
  ]);
  expect(exchanges[1].body.get("client_id")).toBe(
    "client_01M47GV3CYKFW0H78W0XYKGTM5",
  );
  expect(exchanges[1].body.get("resource")).toBe("https://teakvault.com/api");
  expect(seenTokens).toEqual(["Bearer old-access", "Bearer new-access"]);
  expect(discoveryRounds).toBe(2);
});

test("no-view OAuth401 does not force extra discovery or browser sign-in", async () => {
  savedToken = "stored-access";
  let discoveryRounds = 0;
  const oldBrowserCount = authorizeMock.mock.calls.length;
  const discovered = withDiscovery(
    () => Promise.resolve(createCardsResponse(401)) as ReturnType<typeof fetch>,
  );
  globalThis.fetch = ((input, init) => {
    if (String(input).includes("teak-oauth-clients")) {
      discoveryRounds++;
    }
    return discovered(input, init);
  }) as typeof fetch;
  try {
    await expect(searchCards({}, { interactive: false })).rejects.toMatchObject(
      { code: "INVALID_API_KEY" },
    );
    expect(discoveryRounds).toBe(1);
    expect(authorizeMock.mock.calls.length).toBe(oldBrowserCount);
  } finally {
    savedToken = undefined;
  }
});
