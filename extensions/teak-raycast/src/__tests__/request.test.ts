import { afterEach, describe, expect, mock, test } from "bun:test";
import { parseCardsResponse } from "../lib/apiParsers";

const getPreferenceValuesMock = mock(() => ({ apiKey: "valid-test-key" }));

mock.module("@raycast/api", () => ({
  environment: { isDevelopment: false },
  getPreferenceValues: getPreferenceValuesMock,
}));

const { RaycastApiError, request, searchCards } = await import("../lib/api");

const sampleCard = {
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
  return new Response(
    JSON.stringify(status === 200 ? { items: [sampleCard], total: 1 } : body),
    {
      headers: { "Content-Type": "application/json" },
      status,
    },
  );
};

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  getPreferenceValuesMock.mockReset();
  getPreferenceValuesMock.mockImplementation(() => ({
    apiKey: "valid-test-key",
  }));
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

    await request("/api/raycast/search?limit=1", parseCardsResponse, {
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
      await searchCards("", 1);
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
      await searchCards("", 1);
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
      await searchCards("", 1);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(RaycastApiError);
      expect((error as InstanceType<typeof RaycastApiError>).code).toBe(
        "RATE_LIMITED",
      );
    }
  });

  test("fails fast when API key is missing", async () => {
    const fetchMock = mock(async () => createCardsResponse());
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    getPreferenceValuesMock.mockImplementation(() => ({ apiKey: "   " }));

    try {
      await searchCards("", 1);
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
