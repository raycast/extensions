import { afterEach, describe, expect, mock, test } from "bun:test";
import { parseCardsResponse } from "../lib/apiParsers";

const getPreferenceValuesMock = mock(() => ({ apiKey: "valid-test-key" }));

const mockRaycastApi = (isDevelopment: boolean) => {
  mock.module("@raycast/api", () => ({
    environment: { isDevelopment },
    getPreferenceValues: getPreferenceValuesMock,
  }));
};

mockRaycastApi(false);

const {
  createCard,
  getCardById,
  RaycastApiError,
  request,
  searchCards,
  setCardFavorite,
  softDeleteCard,
  updateCard,
} = await import("../lib/api");

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
      ? { items: [sampleCard], total: 1 }
      : body;

  return new Response(JSON.stringify(payload), {
    headers: { "Content-Type": "application/json" },
    status,
  });
};

const createEmptyResponse = (status: number): Response => {
  return new Response(null, {
    status,
    headers: { "Content-Type": "application/json" },
  });
};

const originalFetch = globalThis.fetch;
const originalRequestTimeout = process.env.TEAK_API_REQUEST_TIMEOUT_MS;

afterEach(() => {
  globalThis.fetch = originalFetch;
  process.env.TEAK_API_REQUEST_TIMEOUT_MS = originalRequestTimeout;
  getPreferenceValuesMock.mockReset();
  getPreferenceValuesMock.mockImplementation(() => ({
    apiKey: "valid-test-key",
  }));
  mockRaycastApi(false);
});

describe("raycast request handling", () => {
  test("enforces auth/content-type headers while preserving custom headers", async () => {
    let capturedHeaders: Headers | null = null;
    const fetchMock = mock(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        capturedHeaders = new Headers(init?.headers);
        return createCardsResponse();
      },
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await request("/cards/search?limit=1", parseCardsResponse, {
      headers: {
        Authorization: "Bearer attacker",
        "Content-Type": "text/plain",
        "X-Teak-Test": "present",
      },
      method: "GET",
    });

    expect(capturedHeaders?.get("authorization")).toBe("Bearer valid-test-key");
    expect(capturedHeaders?.get("content-type")).toBe("application/json");
    expect(capturedHeaders?.get("x-teak-test")).toBe("present");
  });

  test("maps fetch failures to NETWORK_ERROR", async () => {
    globalThis.fetch = mock(() => {
      throw new Error("Connection failed");
    }) as unknown as typeof fetch;

    try {
      await searchCards({ limit: 1 });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(RaycastApiError);
      expect((error as InstanceType<typeof RaycastApiError>).code).toBe(
        "NETWORK_ERROR",
      );
    }
  });

  test("retries development requests against a valid loopback URL", async () => {
    mockRaycastApi(true);
    const { searchCards: searchCardsInDev } = await import(
      `../lib/api?dev-fallback=${crypto.randomUUID()}`
    );
    const capturedUrls: string[] = [];

    globalThis.fetch = mock((input: RequestInfo | URL) => {
      capturedUrls.push(String(input));
      throw new Error("Connection failed");
    }) as unknown as typeof fetch;

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
      "http://api.teak.localhost:1355/v1/cards/search?limit=1",
      "http://127.0.0.1:1355/v1/cards/search?limit=1",
    ]);
  });

  test("maps timed out requests to NETWORK_ERROR", async () => {
    process.env.TEAK_API_REQUEST_TIMEOUT_MS = "5";

    globalThis.fetch = mock((_input: RequestInfo | URL, init?: RequestInit) => {
      return new Promise((_, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new Error("Request aborted"));
        });
      });
    }) as unknown as typeof fetch;

    try {
      await searchCards({ limit: 1 });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(RaycastApiError);
      expect((error as InstanceType<typeof RaycastApiError>).code).toBe(
        "NETWORK_ERROR",
      );
    }
  });

  test("maps 401 responses to INVALID_API_KEY", async () => {
    globalThis.fetch = mock(async () =>
      createCardsResponse(401),
    ) as unknown as typeof fetch;

    try {
      await searchCards({ limit: 1 });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(RaycastApiError);
      expect((error as InstanceType<typeof RaycastApiError>).code).toBe(
        "INVALID_API_KEY",
      );
    }
  });

  test("maps 429 responses to RATE_LIMITED", async () => {
    globalThis.fetch = mock(async () =>
      createCardsResponse(429),
    ) as unknown as typeof fetch;

    try {
      await searchCards({ limit: 1 });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(RaycastApiError);
      expect((error as InstanceType<typeof RaycastApiError>).code).toBe(
        "RATE_LIMITED",
      );
    }
  });

  test("maps 404 responses to NOT_FOUND", async () => {
    globalThis.fetch = mock(async () =>
      createCardsResponse(404),
    ) as unknown as typeof fetch;

    try {
      await searchCards({ limit: 1 });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(RaycastApiError);
      expect((error as InstanceType<typeof RaycastApiError>).code).toBe(
        "NOT_FOUND",
      );
    }
  });

  test("setCardFavorite patches favorite state on the favorite endpoint", async () => {
    let capturedUrl: string | null = null;
    let capturedMethod: string | null = null;
    let capturedBody: unknown = null;

    globalThis.fetch = mock(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedUrl = String(input);
        capturedMethod = init?.method ?? null;
        capturedBody = init?.body ? JSON.parse(String(init.body)) : null;
        return createCardsResponse(200, {
          ...sampleCard,
          isFavorited: false,
        });
      },
    ) as unknown as typeof fetch;

    const updated = await setCardFavorite("card_123", false);

    expect(capturedUrl).toContain("/cards/card_123/favorite");
    expect(capturedMethod).toBe("PATCH");
    expect(capturedBody).toEqual({ isFavorited: false });
    expect(updated.isFavorited).toBe(false);
  });

  test("softDeleteCard sends a delete request and accepts 204 responses", async () => {
    let capturedUrl: string | null = null;
    let capturedMethod: string | null = null;

    globalThis.fetch = mock(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedUrl = String(input);
        capturedMethod = init?.method ?? null;
        return createEmptyResponse(204);
      },
    ) as unknown as typeof fetch;

    await softDeleteCard("card_123");

    expect(capturedUrl).toContain("/cards/card_123");
    expect(capturedMethod).toBe("DELETE");
  });

  test("createCard posts structured bookmark payloads", async () => {
    let capturedBody: unknown = null;

    globalThis.fetch = mock(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        capturedBody = init?.body ? JSON.parse(String(init.body)) : null;
        return createCardsResponse(200, {
          appUrl: sampleCard.appUrl,
          card: sampleCard,
          cardId: sampleCard.id,
          status: "created",
        });
      },
    ) as unknown as typeof fetch;

    const result = await createCard({
      content: "Teak",
      source: "raycast_test",
      tags: ["design"],
      url: "https://teakvault.com",
    });

    expect(capturedBody).toEqual({
      content: "Teak",
      source: "raycast_test",
      tags: ["design"],
      url: "https://teakvault.com",
    });
    expect(result.card?.id).toBe("card_123");
  });

  test("getCardById sends a GET request to the card endpoint", async () => {
    let capturedMethod: string | null = null;

    globalThis.fetch = mock(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        capturedMethod = init?.method ?? null;
        return createCardsResponse(200, sampleCard);
      },
    ) as unknown as typeof fetch;

    const result = await getCardById("card_123");

    expect(capturedMethod).toBe("GET");
    expect(result.id).toBe("card_123");
  });

  test("updateCard patches the card endpoint", async () => {
    let capturedBody: unknown = null;
    let capturedMethod: string | null = null;

    globalThis.fetch = mock(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        capturedMethod = init?.method ?? null;
        capturedBody = init?.body ? JSON.parse(String(init.body)) : null;
        return createCardsResponse(200, {
          ...sampleCard,
          notes: "Updated note",
        });
      },
    ) as unknown as typeof fetch;

    const result = await updateCard("card_123", {
      notes: "Updated note",
      tags: ["design"],
    });

    expect(capturedMethod).toBe("PATCH");
    expect(capturedBody).toEqual({
      notes: "Updated note",
      tags: ["design"],
    });
    expect(result.notes).toBe("Updated note");
  });

  test("fails fast when API key is missing", async () => {
    const fetchMock = mock(async () => createCardsResponse());
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    getPreferenceValuesMock.mockImplementation(() => ({ apiKey: "   " }));

    try {
      await searchCards({ limit: 1 });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(RaycastApiError);
      expect((error as InstanceType<typeof RaycastApiError>).code).toBe(
        "MISSING_API_KEY",
      );
    }

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
