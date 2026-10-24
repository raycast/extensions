import { afterEach, describe, expect, mock, test } from "bun:test";
import { createRaycastApiMock } from "./raycastApiMock";

const getPreferenceValuesMock = mock(() => ({ apiKey: "valid-test-key" }));
const authorizeMock = mock(() => Promise.resolve("oauth-access-token"));
const removeTokensMock = mock<(providerId: string) => Promise<void>>(() =>
  Promise.resolve(),
);
const getTokensMock = mock<
  () => Promise<{ accessToken: string; refreshToken?: string } | undefined>
>(() => Promise.resolve(undefined));

const mockRaycastApi = (isDevelopment: boolean) => {
  mock.module("@raycast/api", () =>
    createRaycastApiMock(isDevelopment, {
      getPreferenceValues: getPreferenceValuesMock,
      oauthClient: class {
        private readonly providerId: string;
        constructor(options: { providerId: string }) {
          this.providerId = options.providerId;
        }
        async getTokens() {
          const tokens = await getTokensMock();
          return tokens && { ...tokens, isExpired: () => false };
        }
        removeTokens() {
          return removeTokensMock(this.providerId);
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
};

mockRaycastApi(false);

const {
  addCardToFolder,
  createCard,
  createSmartFolder,
  getCardById,
  getTagOperation,
  hasHiddenCards,
  listFolders,
  RaycastApiError,
  refreshCard,
  restoreCard,
  saveFileCard,
  searchCards,
  setCardArchived,
  setCardDone,
  setCardFavorite,
  softDeleteCard,
  startTagOperation,
  updateCard,
} = await import("../lib/api");
const { signOutTeak, authorizeTeak, getStoredTeakAccessToken } =
  await import("../lib/oauth");

const sampleCard = {
  appUrl: "https://app.teakvault.com/?card=card_123",
  id: "card_123",
  type: "link",
  content: "https://teakvault.com",
  notes: null,
  url: "https://teakvault.com",
  tags: ["design"],
  aiTags: ["inspiration"],
  aiSummary: "A link card",
  isFavorited: true,
  createdAt: 1_739_250_000_000,
  updatedAt: 1_739_250_000_000,
  fileUrl: null,
  thumbnailUrl: null,
  screenshotUrl: null,
  linkPreviewImageUrl: null,
  metadataTitle: "Teak",
  metadataDescription: "Personal knowledge hub",
};

const createCardsResponse = (
  status = 200,
  body: Record<string, unknown> = {},
) => {
  const payload =
    status === 200 && Object.keys(body).length === 0
      ? { items: [sampleCard], pageInfo: { hasMore: false, nextCursor: null } }
      : body;

  return new Response(JSON.stringify(payload), {
    headers: { "Content-Type": "application/json" },
    status,
  });
};

const createEmptyResponse = (status: number): Response =>
  new Response(null, {
    status,
    headers: { "Content-Type": "application/json" },
  });

const workosIssuer = "https://scholarly-hay-77.authkit.app";
const workosClient = "client_01M47GV3CYKFW0H78W0XYKGTM5";
const workosNamespace = `teak:https://teakvault.com/api/v1|${workosIssuer}|${workosClient}`;
const removedNamespaces = () =>
  removeTokensMock.mock.calls.map(([providerId]) => providerId);
const withDiscovery = (transport: typeof fetch): typeof fetch =>
  ((input, init) => {
    const url = String(input);
    const issuer = workosIssuer;
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
            workosClient,
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
const originalRequestTimeout = process.env.TEAK_API_REQUEST_TIMEOUT_MS;

afterEach(() => {
  globalThis.fetch = originalFetch;
  process.env.TEAK_API_REQUEST_TIMEOUT_MS = originalRequestTimeout;
  getPreferenceValuesMock.mockReset();
  getPreferenceValuesMock.mockImplementation(() => ({
    apiKey: "valid-test-key",
  }));
  authorizeMock.mockReset();
  authorizeMock.mockImplementation(() => Promise.resolve("oauth-access-token"));
  removeTokensMock.mockReset();
  removeTokensMock.mockImplementation(() => Promise.resolve());
  getTokensMock.mockReset();
  getTokensMock.mockImplementation(() => Promise.resolve(undefined));
  mockRaycastApi(false);
});

describe("raycast request handling", () => {
  test("sends the API key, the Raycast user agent and a JSON body type", async () => {
    const captured: Headers[] = [];
    const fetchMock = mock((_input: RequestInfo | URL, init?: RequestInit) => {
      captured.push(new Headers(init?.headers));
      return init?.method === "POST"
        ? new Response(
            JSON.stringify({
              appUrl: null,
              cardId: "card_1",
              status: "created",
            }),
            { headers: { "Content-Type": "application/json" }, status: 201 },
          )
        : createCardsResponse();
    });
    globalThis.fetch = withDiscovery(fetchMock as unknown as typeof fetch);

    await searchCards({ limit: 1 }, "interactive");
    await createCard({ content: "Hello" }, "interactive");

    const [listHeaders, createHeaders] = captured;
    expect(listHeaders?.get("authorization")).toBe("Bearer valid-test-key");
    expect(listHeaders?.get("user-agent")).toBe("teak-raycast");
    expect(createHeaders?.get("authorization")).toBe("Bearer valid-test-key");
    expect(createHeaders?.get("content-type")).toBe("application/json");
  });

  test("maps fetch failures to NETWORK_ERROR", async () => {
    globalThis.fetch = withDiscovery(
      mock(() => {
        throw new Error("Connection failed");
      }) as unknown as typeof fetch,
    );

    try {
      await searchCards({ limit: 1 }, "interactive");
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(RaycastApiError);
      expect((error as InstanceType<typeof RaycastApiError>).code).toBe(
        "NETWORK_ERROR",
      );
    }
  });

  test("uses the Convex site URL for development requests", async () => {
    mockRaycastApi(true);
    const { searchCards: searchCardsInDev } = await import(
      `../lib/api?dev-fallback=${crypto.randomUUID()}`
    );
    const capturedUrls: string[] = [];

    globalThis.fetch = withDiscovery(
      mock((input: RequestInfo | URL) => {
        capturedUrls.push(String(input));
        throw new Error("Connection failed");
      }) as unknown as typeof fetch,
    );

    try {
      await searchCardsInDev({ limit: 1 });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(RaycastApiError);
      expect((error as InstanceType<typeof RaycastApiError>).code).toBe(
        "NETWORK_ERROR",
      );
    }

    expect(capturedUrls).toEqual([
      "https://reminiscent-kangaroo-59.convex.site/v1/cards?include=content%2Cmetadata%2Cprocessing&limit=1",
    ]);
  });

  test("maps timed out requests to NETWORK_ERROR", async () => {
    process.env.TEAK_API_REQUEST_TIMEOUT_MS = "5";

    globalThis.fetch = withDiscovery(
      mock(
        (_input: RequestInfo | URL, init?: RequestInit) =>
          new Promise((_, reject) => {
            init?.signal?.addEventListener("abort", () => {
              reject(new Error("Request aborted"));
            });
          }),
      ) as unknown as typeof fetch,
    );

    try {
      await searchCards({ limit: 1 }, "interactive");
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(RaycastApiError);
      expect((error as InstanceType<typeof RaycastApiError>).code).toBe(
        "NETWORK_ERROR",
      );
    }
  });

  test("maps 401 responses to INVALID_API_KEY", async () => {
    globalThis.fetch = withDiscovery(
      mock(async () => createCardsResponse(401)) as unknown as typeof fetch,
    );

    try {
      await searchCards({ limit: 1 }, "interactive");
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(RaycastApiError);
      expect((error as InstanceType<typeof RaycastApiError>).code).toBe(
        "INVALID_API_KEY",
      );
    }
  });

  test.each([
    [401, "INVALID_API_KEY"],
    [404, "NOT_FOUND"],
    [429, "RATE_LIMITED"],
  ])("maps a non-JSON %i response by its status", async (status, code) => {
    globalThis.fetch = withDiscovery(
      mock(
        async () => new Response("<html>Too many requests</html>", { status }),
      ) as unknown as typeof fetch,
    );

    try {
      await searchCards({ limit: 1 }, "interactive");
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(RaycastApiError);
      expect((error as InstanceType<typeof RaycastApiError>).code).toBe(code);
    }
  });

  test("maps 429 responses to RATE_LIMITED", async () => {
    globalThis.fetch = withDiscovery(
      mock(async () => createCardsResponse(429)) as unknown as typeof fetch,
    );

    try {
      await searchCards({ limit: 1 }, "interactive");
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(RaycastApiError);
      expect((error as InstanceType<typeof RaycastApiError>).code).toBe(
        "RATE_LIMITED",
      );
    }
  });

  test("maps 404 responses to NOT_FOUND", async () => {
    globalThis.fetch = withDiscovery(
      mock(async () => createCardsResponse(404)) as unknown as typeof fetch,
    );

    try {
      await searchCards({ limit: 1 }, "interactive");
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(RaycastApiError);
      expect((error as InstanceType<typeof RaycastApiError>).code).toBe(
        "NOT_FOUND",
      );
    }
  });

  test("maps API configuration failures to CONFIG_ERROR", async () => {
    globalThis.fetch = withDiscovery(
      mock(
        async () =>
          new Response(
            JSON.stringify({
              code: "CONFIG_ERROR",
              error: "Missing or invalid Convex API configuration",
            }),
            {
              headers: { "Content-Type": "application/json" },
              status: 500,
            },
          ),
      ) as unknown as typeof fetch,
    );

    try {
      await searchCards({ limit: 1 }, "interactive");
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(RaycastApiError);
      expect((error as InstanceType<typeof RaycastApiError>).code).toBe(
        "CONFIG_ERROR",
      );
    }
  });

  test("setCardFavorite patches favorite state on the favorite endpoint", async () => {
    let capturedUrl: string | null = null;
    let capturedMethod: string | null = null;
    let capturedBody: unknown = null;

    globalThis.fetch = withDiscovery(
      mock((input: RequestInfo | URL, init?: RequestInit) => {
        capturedUrl = String(input);
        capturedMethod = init?.method ?? null;
        capturedBody = init?.body ? JSON.parse(String(init.body)) : null;
        return createCardsResponse(200, {
          ...sampleCard,
          isFavorited: false,
        });
      }) as unknown as typeof fetch,
    );

    const updated = await setCardFavorite("card_123", false, "interactive");

    expect(capturedUrl).toContain("/cards/card_123/favorite");
    expect(capturedMethod).toBe("PATCH");
    expect(capturedBody).toEqual({ isFavorited: false });
    expect(updated.isFavorited).toBe(false);
  });

  test("softDeleteCard sends a delete request and accepts 204 responses", async () => {
    let capturedUrl: string | null = null;
    let capturedMethod: string | null = null;

    globalThis.fetch = withDiscovery(
      mock((input: RequestInfo | URL, init?: RequestInit) => {
        capturedUrl = String(input);
        capturedMethod = init?.method ?? null;
        return createEmptyResponse(204);
      }) as unknown as typeof fetch,
    );

    await softDeleteCard("card_123", "interactive");

    expect(capturedUrl).toContain("/cards/card_123");
    expect(capturedMethod).toBe("DELETE");
  });

  test("createCard posts structured bookmark payloads", async () => {
    let capturedBody: unknown = null;

    globalThis.fetch = withDiscovery(
      mock((_input: RequestInfo | URL, init?: RequestInit) => {
        capturedBody = init?.body ? JSON.parse(String(init.body)) : null;
        return createCardsResponse(200, {
          appUrl: sampleCard.appUrl,
          card: sampleCard,
          cardId: sampleCard.id,
          status: "created",
        });
      }) as unknown as typeof fetch,
    );

    const result = await createCard(
      {
        content: "Teak",
        source: "raycast_test",
        tags: ["design"],
        url: "https://teakvault.com",
      },
      "interactive",
    );

    expect(capturedBody).toEqual({
      content: "Teak",
      source: "raycast_test",
      tags: ["design"],
      url: "https://teakvault.com",
    });
    expect(result.card?.id).toBe("card_123");
  });

  test("createCard forwards explicit text Markdown exactly", async () => {
    let capturedBody: Record<string, unknown> | null = null;
    globalThis.fetch = withDiscovery(
      mock((_input: RequestInfo | URL, init?: RequestInit) => {
        capturedBody = JSON.parse(String(init?.body));
        return createCardsResponse(200, {
          appUrl: sampleCard.appUrl,
          cardId: sampleCard.id,
          status: "created",
        });
      }) as unknown as typeof fetch,
    );
    const content = "\uFEFF  # Raycast\r\n\r\nBody  \n";

    await createCard(
      { cardType: "text", content, source: "raycast_test" },
      "interactive",
    );

    expect(capturedBody).toEqual({
      cardType: "text",
      content,
      source: "raycast_test",
    });
  });

  test("getCardById sends a GET request to the card endpoint", async () => {
    let capturedMethod: string | null = null;

    globalThis.fetch = withDiscovery(
      mock((_input: RequestInfo | URL, init?: RequestInit) => {
        capturedMethod = init?.method ?? null;
        return createCardsResponse(200, sampleCard);
      }) as unknown as typeof fetch,
    );

    const result = await getCardById("card_123", "interactive");

    expect(capturedMethod).toBe("GET");
    expect(result.id).toBe("card_123");
  });

  test("updateCard patches the card endpoint", async () => {
    let capturedBody: unknown = null;
    let capturedMethod: string | null = null;

    globalThis.fetch = withDiscovery(
      mock((_input: RequestInfo | URL, init?: RequestInit) => {
        capturedMethod = init?.method ?? null;
        capturedBody = init?.body ? JSON.parse(String(init.body)) : null;
        return createCardsResponse(200, {
          ...sampleCard,
          notes: "Updated note",
        });
      }) as unknown as typeof fetch,
    );

    const result = await updateCard(
      "card_123",
      {
        notes: "Updated note",
        tags: ["design"],
      },
      "interactive",
    );

    expect(capturedMethod).toBe("PATCH");
    expect(capturedBody).toEqual({
      notes: "Updated note",
      tags: ["design"],
    });
    expect(result.notes).toBe("Updated note");
  });

  test("falls back to browser OAuth when no API key is set", async () => {
    getPreferenceValuesMock.mockImplementation(() => ({ apiKey: "   " }));

    let capturedHeaders: Headers | null = null;
    const fetchMock = mock((_input: RequestInfo | URL, init?: RequestInit) => {
      capturedHeaders = new Headers(init?.headers);
      return createCardsResponse();
    });
    globalThis.fetch = withDiscovery(fetchMock as unknown as typeof fetch);

    await searchCards({ limit: 1 }, "interactive");

    expect(authorizeMock).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalled();
    expect(capturedHeaders?.get("authorization")).toBe(
      "Bearer oauth-access-token",
    );
  });

  test("discovery outage remains a connection failure without opening sign-in", async () => {
    getPreferenceValuesMock.mockImplementation(() => ({ apiKey: "" }));
    getTokensMock.mockResolvedValue({ accessToken: "saved" });
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response(null, { status: 503 })),
    ) as unknown as typeof fetch;
    await expect(
      searchCards({ limit: 1 }, "interactive"),
    ).rejects.toMatchObject({
      code: "NETWORK_ERROR",
    });
    expect(authorizeMock).not.toHaveBeenCalled();
    expect(removeTokensMock).not.toHaveBeenCalled();
  });

  test("reauthorization discovery outage keeps credentials and reports a network failure", async () => {
    getPreferenceValuesMock.mockImplementation(() => ({ apiKey: "" }));
    let discoveryReads = 0;
    let apiCalls = 0;
    const discovered = withDiscovery(
      mock(() => {
        apiCalls += 1;
        return createCardsResponse(401);
      }) as unknown as typeof fetch,
    );
    globalThis.fetch = ((input, init) => {
      if (String(input).includes("oauth-protected-resource")) {
        discoveryReads += 1;
      }
      if (discoveryReads >= 2 && String(input).includes(".well-known")) {
        return Promise.resolve(new Response(null, { status: 503 }));
      }
      return discovered(input, init);
    }) as typeof fetch;
    await expect(
      searchCards({ limit: 1 }, "interactive"),
    ).rejects.toMatchObject({
      code: "NETWORK_ERROR",
    });
    expect(apiCalls).toBe(1);
    expect(removeTokensMock).not.toHaveBeenCalled();
  });

  test("refreshes the OAuth token once after a 401", async () => {
    getPreferenceValuesMock.mockImplementation(() => ({ apiKey: "" }));
    authorizeMock.mockReset();
    authorizeMock
      .mockImplementationOnce(() => Promise.resolve("stale-token"))
      .mockImplementationOnce(() => Promise.resolve("fresh-token"));

    const seenTokens: string[] = [];
    let call = 0;
    globalThis.fetch = withDiscovery(
      mock((_input: RequestInfo | URL, init?: RequestInit) => {
        seenTokens.push(new Headers(init?.headers).get("authorization") ?? "");
        call += 1;
        return call === 1 ? createCardsResponse(401) : createCardsResponse();
      }) as unknown as typeof fetch,
    );

    await searchCards({ limit: 1 }, "interactive");

    expect(seenTokens).toEqual(["Bearer stale-token", "Bearer fresh-token"]);
  });
});

describe("Raycast sign out", () => {
  test("disconnects the installation before removing its tokens", async () => {
    getTokensMock.mockResolvedValueOnce({
      accessToken: "access",
      refreshToken: "refresh",
    });
    globalThis.fetch = withDiscovery(
      mock((input: RequestInfo | URL, init?: RequestInit) => {
        expect(String(input)).toBe(
          "https://teakvault.com/api/v1/oauth/disconnect",
        );
        expect(init?.method).toBe("POST");
        expect(new Headers(init?.headers).get("authorization")).toBe(
          "Bearer access",
        );
        expect(removeTokensMock).not.toHaveBeenCalled();
        return Promise.resolve(new Response(null, { status: 204 }));
      }) as unknown as typeof fetch,
    );
    expect(await signOutTeak()).toBe("disconnected");
    expect(removedNamespaces()).toContain(workosNamespace);
  });

  test("waits for a running authorization and blocks refresh while signing out", async () => {
    let finishAuthorization: (token: string) => void = () => undefined;
    authorizeMock.mockImplementationOnce(
      () =>
        new Promise<string>((resolve) => {
          finishAuthorization = resolve;
        }),
    );
    globalThis.fetch = withDiscovery(
      mock(
        () => new Response(null, { status: 200 }),
      ) as unknown as typeof fetch,
    );
    const authorization = authorizeTeak();
    while (authorizeMock.mock.calls.length === 0) {
      await Promise.resolve();
    }
    const previousTokenReads = getTokensMock.mock.calls.length;
    const signOut = signOutTeak();
    await expect(authorizeTeak()).rejects.toThrow("sign-out is in progress");
    expect(await getStoredTeakAccessToken()).toBeNull();
    expect(getTokensMock.mock.calls.length).toBe(previousTokenReads);
    getTokensMock.mockResolvedValueOnce({
      accessToken: "fresh-access",
      refreshToken: "fresh-refresh",
    });
    globalThis.fetch = withDiscovery(
      mock((_input: RequestInfo | URL, init?: RequestInit) => {
        expect(new Headers(init?.headers).get("authorization")).toBe(
          "Bearer fresh-access",
        );
        return Promise.resolve(new Response(null, { status: 204 }));
      }) as unknown as typeof fetch,
    );
    finishAuthorization("fresh-access");
    await authorization;
    expect(await signOut).toBe("disconnected");
    expect(removedNamespaces()).toContain(workosNamespace);
  });

  test("handles an already-cleared session without revoking an API key", async () => {
    getTokensMock.mockResolvedValueOnce(undefined);
    const fetchMock = mock();
    globalThis.fetch = withDiscovery(fetchMock as unknown as typeof fetch);
    await signOutTeak();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(removedNamespaces()).toContain(workosNamespace);
  });
});

describe("raycast file saves and Trash", () => {
  test("uploads a file, then saves it with the upload's key and ETag", async () => {
    const { mkdtempSync, writeFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const { tmpdir } = await import("node:os");
    const filePath = join(
      mkdtempSync(join(tmpdir(), "teak-raycast-")),
      "poster.png",
    );
    writeFileSync(filePath, "png-bytes");
    const calls: Array<{ body: unknown; method: string; url: string }> = [];
    globalThis.fetch = mock((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ body: init?.body, method: String(init?.method), url });
      if (url.endsWith("/uploads")) {
        return Promise.resolve(
          Response.json({
            expiresIn: 900,
            fileKey: "users/u/file/poster.png",
            maxFileSize: 104_857_600,
            method: "PUT",
            uploadUrl: "https://files.example/put",
          }),
        );
      }
      if (url === "https://files.example/put") {
        return Promise.resolve(
          new Response(null, { headers: { ETag: '"etag-1"' }, status: 200 }),
        );
      }
      return Promise.resolve(
        Response.json({
          appUrl: null,
          card: null,
          cardId: "card_f",
          status: "created",
        }),
      );
    }) as unknown as typeof fetch;

    const saved = await saveFileCard(
      filePath,
      { source: "raycast_finder" },
      "interactive",
    );

    expect(saved.cardId).toBe("card_f");
    expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
      "POST https://teakvault.com/api/v1/uploads",
      "PUT https://files.example/put",
      "POST https://teakvault.com/api/v1/cards",
    ]);
    expect(JSON.parse(String(calls[0]?.body))).toEqual({
      fileName: "poster.png",
      fileSize: 9,
      mimeType: "image/png",
    });
    expect(JSON.parse(String(calls[2]?.body))).toMatchObject({
      fileEtag: '"etag-1"',
      fileKey: "users/u/file/poster.png",
      source: "raycast_finder",
    });
  });

  test("searches Trash and color filters with full card details", async () => {
    const urls: string[] = [];
    globalThis.fetch = withDiscovery(
      mock((input: RequestInfo | URL) => {
        urls.push(String(input));
        return createCardsResponse(200);
      }) as unknown as typeof fetch,
    );
    await searchCards(
      {
        hex: ["#112233"],
        hue: ["blue", "teal"],
        limit: 20,
        style: ["minimal"],
        trashed: true,
      },
      "interactive",
    );
    expect(urls).toEqual([
      "https://teakvault.com/api/v1/cards?style=minimal&hue=blue&hue=teal&hex=%23112233&include=content%2Cmetadata%2Cprocessing&trashed=true&limit=20",
    ]);
  });

  test("restores a card from Trash", async () => {
    const urls: string[] = [];
    globalThis.fetch = mock((input: RequestInfo | URL, init?: RequestInit) => {
      urls.push(`${init?.method} ${String(input)}`);
      return Promise.resolve(createEmptyResponse(204));
    }) as unknown as typeof fetch;
    await restoreCard("card_123", "interactive");
    expect(urls).toEqual([
      "POST https://teakvault.com/api/v1/cards/card_123/restore",
    ]);
  });

  describe("archive, done, folders and tags", () => {
    const calls: Array<{ body: unknown; method: string; url: string }> = [];
    const respondWith = (response: () => Response) => {
      calls.length = 0;
      globalThis.fetch = withDiscovery(
        mock((input: RequestInfo | URL, init?: RequestInit) => {
          calls.push({
            body: init?.body ? JSON.parse(String(init.body)) : null,
            method: init?.method ?? "GET",
            url: String(input),
          });
          return Promise.resolve(response());
        }) as unknown as typeof fetch,
      );
    };
    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), {
        headers: { "Content-Type": "application/json" },
        status,
      });

    test("archives and unarchives a card and reads the new state", async () => {
      respondWith(() => json({ ...sampleCard, isArchived: true }));
      const archived = await setCardArchived("card_123", true, "interactive");
      expect(calls).toEqual([
        {
          body: { isArchived: true },
          method: "PATCH",
          url: "https://teakvault.com/api/v1/cards/card_123",
        },
      ]);
      expect(archived.isArchived).toBe(true);
    });

    test("marks a link done with POST and not done with DELETE", async () => {
      respondWith(() =>
        json({ ...sampleCard, completedAt: 1_739_250_000_000 }),
      );
      const done = await setCardDone("card_123", true, "interactive");
      await setCardDone("card_123", false, "interactive");
      expect(calls.map(({ method, url }) => `${method} ${url}`)).toEqual([
        "POST https://teakvault.com/api/v1/cards/card_123/done",
        "DELETE https://teakvault.com/api/v1/cards/card_123/done",
      ]);
      expect(done.completedAt).toBe(1_739_250_000_000);
    });

    test("queues a details refresh", async () => {
      respondWith(() =>
        json({ cardId: "card_123", requestedAt: 1, status: "queued" }, 202),
      );
      await refreshCard("card_123", "interactive");
      expect(calls).toEqual([
        {
          body: null,
          method: "POST",
          url: "https://teakvault.com/api/v1/cards/card_123/refresh",
        },
      ]);
    });

    test("lists manual and smart folders", async () => {
      const folder = {
        cardCount: 3,
        color: "blue",
        createdAt: 1,
        id: "folder_1",
        kind: "manual",
        name: "Reading list",
        query: null,
        updatedAt: 1,
      };
      respondWith(() =>
        json({
          items: [
            folder,
            {
              ...folder,
              cardCount: null,
              id: "folder_2",
              kind: "smart",
              name: "Moodboard",
              query: "type:image",
            },
          ],
        }),
      );
      const { items } = await listFolders("interactive");
      expect(items.map((item) => [item.name, item.kind, item.query])).toEqual([
        ["Reading list", "manual", null],
        ["Moodboard", "smart", "type:image"],
      ]);
    });

    test("rejects a folder list the extension can't read", async () => {
      respondWith(() => json({ items: [{ id: "folder_1" }] }));
      await expect(listFolders("interactive")).rejects.toBeInstanceOf(
        RaycastApiError,
      );
    });

    test("creates a smart folder from a search", async () => {
      respondWith(() =>
        json(
          {
            cardCount: null,
            color: null,
            createdAt: 1,
            id: "folder_3",
            kind: "smart",
            name: "Unread links",
            query: "is:todo",
            updatedAt: 1,
          },
          201,
        ),
      );
      await createSmartFolder(
        { name: "Unread links", query: "is:todo" },
        "interactive",
      );
      expect(calls[0]).toEqual({
        body: { kind: "smart", name: "Unread links", query: "is:todo" },
        method: "POST",
        url: "https://teakvault.com/api/v1/folders",
      });
    });

    test("says so when a folder with that name already exists", async () => {
      respondWith(() =>
        json(
          {
            code: "REQUEST_FAILED",
            error: "A folder with this name already exists",
          },
          409,
        ),
      );
      const failure = await createSmartFolder(
        { name: "Reading list", query: "is:todo" },
        "interactive",
      ).catch((error: unknown) => error);
      expect(failure).toBeInstanceOf(RaycastApiError);
      expect((failure as InstanceType<typeof RaycastApiError>).code).toBe(
        "FOLDER_EXISTS",
      );
      expect((failure as Error).message).toContain("already exists");
    });

    test("adds a card to a folder and reports cards that couldn't be added", async () => {
      respondWith(() =>
        json({
          failedIds: ["card_123"],
          folderLimitIds: ["card_123"],
          updatedIds: [],
        }),
      );
      const result = await addCardToFolder(
        "folder_1",
        " card_123 ",
        "interactive",
      );
      expect(calls[0]).toEqual({
        body: { cardIds: ["card_123"] },
        method: "POST",
        url: "https://teakvault.com/api/v1/folders/folder_1/cards",
      });
      expect(result.folderLimitIds).toEqual(["card_123"]);
    });

    test("starts a tag rename and polls its progress", async () => {
      const operation = {
        changed: 0,
        completedAt: null,
        createdAt: 1,
        error: null,
        from: "design",
        id: "op_1",
        kind: "rename",
        processed: 0,
        status: "running",
        to: "ui",
        total: 4,
        updatedAt: 1,
      };
      respondWith(() => json(operation, 202));
      const started = await startTagOperation(
        { kind: "rename", tag: "design", to: "ui" },
        "interactive",
      );
      respondWith(() =>
        json({ ...operation, changed: 4, processed: 4, status: "completed" }),
      );
      const finished = await getTagOperation("op_1", "interactive");
      expect(started.status).toBe("running");
      expect(finished).toMatchObject({ changed: 4, status: "completed" });
      expect(calls[0]?.url).toBe(
        "https://teakvault.com/api/v1/tags/operations/op_1",
      );
    });

    test("names the tag a merge folds in and the one it keeps", async () => {
      respondWith(() =>
        json({
          changed: 0,
          error: null,
          id: "op_2",
          kind: "merge",
          status: "running",
          total: 1,
        }),
      );
      await startTagOperation(
        { into: "design", kind: "merge", tag: "ui" },
        "interactive",
      );
      expect(calls[0]).toEqual({
        body: { from: "ui", into: "design" },
        method: "POST",
        url: "https://teakvault.com/api/v1/tags/merge",
      });
    });

    test("maps a running tag change to its own error", async () => {
      respondWith(() =>
        json({ code: "TAG_OPERATION_RUNNING", error: "busy" }, 409),
      );
      const failure = await startTagOperation(
        { kind: "delete", tag: "design" },
        "interactive",
      ).catch((error: unknown) => error);
      expect(failure).toBeInstanceOf(RaycastApiError);
      expect((failure as InstanceType<typeof RaycastApiError>).code).toBe(
        "TAG_OPERATION_RUNNING",
      );
    });

    test("searches with a shuffle seed, similar card, folder and archive filter", async () => {
      respondWith(() =>
        json({ items: [], pageInfo: { hasMore: false, nextCursor: null } }),
      );
      await searchCards(
        {
          archived: "only",
          folder: "folder_1",
          query: "is:todo",
          shuffleSeed: 42,
          similarTo: "card_123",
          sort: "shuffle",
        },
        "interactive",
      );
      const url = new URL(calls[0]?.url ?? "");
      expect(Object.fromEntries(url.searchParams)).toMatchObject({
        archived: "only",
        folder: "folder_1",
        q: "is:todo",
        shuffleSeed: "42",
        similarTo: "card_123",
        sort: "shuffle",
      });
    });

    test("creates a card with tags and a note", async () => {
      respondWith(() =>
        json({ appUrl: null, cardId: "card_9", status: "created" }, 201),
      );
      await createCard(
        { content: "Idea", notes: "from a call", tags: ["design", "ideas"] },
        "interactive",
      );
      expect(calls[0]?.body).toEqual({
        content: "Idea",
        notes: "from a call",
        tags: ["design", "ideas"],
      });
    });

    test("finds hidden cards by checking both hidden tags", async () => {
      respondWith(() =>
        json({ items: [], pageInfo: { hasMore: false, nextCursor: null } }),
      );
      expect(await hasHiddenCards("silent")).toBe(false);
      expect(
        calls.map((call) => new URL(call.url).searchParams.get("tag")).sort(),
      ).toEqual(["hidden", "secret"]);
      respondWith(() =>
        json({
          items: [sampleCard],
          pageInfo: { hasMore: false, nextCursor: null },
        }),
      );
      expect(await hasHiddenCards("silent")).toBe(true);
    });
  });
});
