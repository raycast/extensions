import { afterEach, describe, expect, test, vi } from "vitest";

import { createTwentyClient, TwentyApiError } from "./client";

describe("createTwentyClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("prefixes requests with /rest and sends JSON auth headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const client = createTwentyClient({
      token: "secret-token",
      authHeader: "Bearer secret-token",
      baseUrl: "https://app.twenty.com",
      restBaseUrl: "https://app.twenty.com/rest",
      keepObjectFormOpen: true,
    });

    await client.requestJson("/metadata/objects");

    expect(fetchMock).toHaveBeenCalledWith("https://app.twenty.com/rest/metadata/objects", {
      headers: {
        authorization: "Bearer secret-token",
        "content-type": "application/json",
      },
    });
  });

  test("throws a TwentyApiError for non-ok responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("bad request", {
        status: 400,
        statusText: "Bad Request",
      }),
    );

    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const client = createTwentyClient({
      token: "secret-token",
      authHeader: "Bearer secret-token",
      baseUrl: "https://app.twenty.com",
      restBaseUrl: "https://app.twenty.com/rest",
      keepObjectFormOpen: true,
    });

    await expect(client.requestJson("/metadata/objects")).rejects.toEqual(
      new TwentyApiError("Twenty API request failed (400)", 400, "bad request"),
    );
  });

  test("returns undefined for no-content responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));

    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const client = createTwentyClient({
      token: "secret-token",
      authHeader: "Bearer secret-token",
      baseUrl: "https://app.twenty.com",
      restBaseUrl: "https://app.twenty.com/rest",
      keepObjectFormOpen: true,
    });

    const result = await client.requestJson("/metadata/objects");
    expect(result).toBeUndefined();
  });

  test("wraps rejected fetch calls in a TwentyApiError", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));

    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const client = createTwentyClient({
      token: "secret-token",
      authHeader: "Bearer secret-token",
      baseUrl: "https://app.twenty.com",
      restBaseUrl: "https://app.twenty.com/rest",
      keepObjectFormOpen: true,
    });

    await expect(client.requestJson("/metadata/objects")).rejects.toEqual(
      new TwentyApiError(
        "Twenty API request failed (transport error)",
        0,
        "https://app.twenty.com/rest/metadata/objects: network down",
      ),
    );
  });
});
