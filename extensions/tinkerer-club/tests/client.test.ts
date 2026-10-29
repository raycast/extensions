import { describe, expect, it, vi } from "vitest";
import { FetchAdapter, TinkererApiClient, TinkererApiError } from "../src/api/client";
import { ApiCatalog } from "../src/types/api";

function config(overrides: Partial<ConstructorParameters<typeof TinkererApiClient>[0]> = {}) {
  return {
    apiKey: "secret-value",
    baseUrl: "https://app.tinkerer.club/",
    ...overrides,
  };
}

function catalogFixture(): ApiCatalog {
  return {
    endpoints: { call: "/api/v1/{router}/{procedure}", catalog: "/api/v1", docs: "/api/docs", mcp: "/api/mcp" },
    name: "Tinkerer Club Platform API",
    procedureCount: 1,
    procedures: [
      {
        description: "Search everything",
        inputSchema: {
          type: "object",
          properties: { query: { type: "string", minLength: 1 } },
          required: ["query"],
          additionalProperties: false,
        },
        path: "search.all",
        readOnly: true,
        tags: ["search"],
        type: "query",
      },
    ],
    version: "1.0.0",
  };
}

describe("TinkererApiClient", () => {
  it("rejects plaintext remote endpoints so the API key cannot be sent over HTTP", () => {
    expect(() => new TinkererApiClient(config({ baseUrl: "http://example.com" }), vi.fn())).toThrow("must use HTTPS");
  });

  it("allows a local HTTP endpoint for development", () => {
    const client = new TinkererApiClient(config({ baseUrl: "http://localhost:3000/" }), vi.fn());
    expect(client.baseUrl).toBe("http://localhost:3000");
  });

  it("loads and validates the catalog", async () => {
    const fetchAdapter = vi.fn(async () => Response.json(catalogFixture()));
    const client = new TinkererApiClient(config(), fetchAdapter);

    await expect(client.catalog()).resolves.toEqual(catalogFixture());
    expect(fetchAdapter).toHaveBeenCalledOnce();
  });

  it("splits nested routers at the final dot", () => {
    const client = new TinkererApiClient(config(), vi.fn());
    expect(client.procedureUrl("admin.unrepliedComments.list")).toBe(
      "https://app.tinkerer.club/api/v1/admin.unrepliedComments/list",
    );
  });

  it("posts raw JSON and applies the documented API key header", async () => {
    let capturedUrl: string | URL | Request | undefined;
    let capturedInit: RequestInit | undefined;
    const fetchAdapter: FetchAdapter = async (url, init) => {
      capturedUrl = url;
      capturedInit = init;
      return Response.json({ ok: true });
    };
    const client = new TinkererApiClient(config(), fetchAdapter);

    await client.call({ path: "search.all", type: "query" }, { query: "openclaw" });

    expect(capturedUrl).toBe("https://app.tinkerer.club/api/v1/search/all");
    expect(capturedInit?.method).toBe("POST");
    expect(capturedInit?.body).toBe('{"query":"openclaw"}');
    expect(new Headers(capturedInit?.headers).get("x-api-key")).toBe("secret-value");
  });

  it("rejects a successful HTML response instead of displaying it as data", async () => {
    const fetchAdapter = vi.fn(
      async () => new Response("<!doctype html>", { status: 200, headers: { "Content-Type": "text/html" } }),
    );
    const client = new TinkererApiClient(config(), fetchAdapter);

    await expect(client.call({ path: "search.all", type: "query" }, { query: "raycast" })).rejects.toThrow(
      "non-JSON response",
    );
  });

  it("returns a safe authentication error without exposing the secret", async () => {
    const fetchAdapter = vi.fn(async () => new Response("", { status: 401 }));
    const client = new TinkererApiClient(config(), fetchAdapter);

    try {
      await client.call({ path: "user.getCurrentUser", type: "query" }, {});
      throw new Error("Expected authentication to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(TinkererApiError);
      expect((error as TinkererApiError).status).toBe(401);
      expect((error as Error).message).not.toContain("secret-value");
    }
  });
});
