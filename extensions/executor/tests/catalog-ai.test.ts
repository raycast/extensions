import { afterEach, beforeAll, describe, expect, mock, test } from "bun:test";

import { raycastState } from "./raycast-mock";
const { runInWorkspace } = await import("../src/lib/workspaces");
const workspace = { id: "a".repeat(64), name: "Personal", baseUrl: "https://executor.test", apiKey: "test-key" };

type CatalogAi = typeof import("../src/lib/catalog-ai");
let catalogAi: CatalogAi;
const originalFetch = globalThis.fetch;

beforeAll(async () => {
  catalogAi = await import("../src/lib/catalog-ai");
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  raycastState.launches.length = 0;
});

function json(value: unknown): Response {
  return Response.json(value);
}

function completedHandoff() {
  return {
    status: "completed",
    text: "",
    structured: {
      result: {
        ok: true,
        data: { url: "https://executor.test/org/personal/integrations/executor", instructions: "Continue" },
      },
    },
    isError: false,
  };
}

describe("integration catalog AI actions", () => {
  test("searches one bounded filtered catalog page and returns the next page", async () => {
    let requested = "";
    globalThis.fetch = mock(async (request: RequestInfo | URL) => {
      requested = String(request);
      return json({
        results: Array.from({ length: 40 }, (_, index) => ({
          domain: `service-${index}.test`,
          name: `Service ${index}`,
          description: "API",
          surfaces: [{ kind: "openapi", slug: `service-${index}` }],
        })),
      });
    }) as typeof fetch;

    const result = await catalogAi.searchIntegrationCatalog({ query: "service", kind: "openapi", page: 2 });
    expect(result.items).toHaveLength(40);
    expect(result.nextPage).toBe(3);
    const url = new URL(requested);
    expect(url.searchParams.get("offset")).toBe("80");
    expect(url.searchParams.get("kind")).toBe("openapi");
  });

  test("routes endpoint-like input away from public catalog search", async () => {
    await expect(catalogAi.searchIntegrationCatalog({ query: "https://example.test/mcp" })).rejects.toThrow(
      "prepare-integration-setup",
    );
  });

  test("opens native setup for an exact catalog surface and workspace", async () => {
    globalThis.fetch = mock(async (request: RequestInfo | URL) => {
      const url = String(request);
      if (url.startsWith("https://integrations.sh/")) {
        return json({
          results: [
            {
              domain: "acme.test",
              name: "Acme",
              description: "Acme tools",
              surfaces: [
                {
                  kind: "mcp",
                  slug: "acme",
                  url: "https://mcp.acme.test/server",
                  auth: { kind: "header", header: "X-Acme-Key", note: "Enter the key in Executor." },
                  specOverrides: [{ op: "replace", path: "/name", value: "Acme" }],
                },
              ],
            },
          ],
        });
      }
      return json(completedHandoff());
    }) as typeof fetch;

    const result = await runInWorkspace(workspace, () =>
      catalogAi.prepareIntegrationSetup({ kind: "mcp", domain: "acme.test", slug: "acme" }),
    );
    expect(result.status).toBe("user_action_required");
    expect(result.pending).toBe(true);
    expect(raycastState.launches.at(-1)).toEqual({
      name: "add-integration",
      type: "userInitiated",
      context: {
        workspaceId: workspace.id,
        integrationSetup: { kind: "mcp", domain: "acme.test", catalogSlug: "acme", endpoint: undefined },
      },
    });
  });

  test("rejects credential-bearing custom endpoints before creating a workspace handoff", async () => {
    let calls = 0;
    globalThis.fetch = mock(async () => {
      calls++;
      return json(completedHandoff());
    }) as typeof fetch;
    await expect(
      catalogAi.prepareIntegrationSetup({ kind: "graphql", endpoint: "https://user:secret@example.test/graphql" }),
    ).rejects.toThrow("enter credentials privately in Add Connection");
    expect(calls).toBe(0);
  });

  test("reselects a later-page result using the registry's literal substring search", async () => {
    const rows = [
      ...Array.from({ length: 40 }, (_, index) => ({
        domain: `other-${index}.test`,
        name: `Other ${index}`,
        description: "Connects to acme.test",
        surfaces: [{ kind: "mcp", slug: "other", url: "https://other.test/mcp" }],
      })),
      {
        domain: "acme.test",
        name: "Acme",
        description: "Acme tools",
        surfaces: [{ kind: "mcp", slug: "acme", url: "https://acme.test/mcp" }],
      },
    ];
    const searches: { query: string; offset: number }[] = [];
    globalThis.fetch = mock(async (request: RequestInfo | URL) => {
      const url = new URL(String(request));
      if (url.origin !== "https://integrations.sh") return json(completedHandoff());
      const query = url.searchParams.get("q")!.toLowerCase();
      const offset = Number(url.searchParams.get("offset"));
      searches.push({ query, offset });
      // Match the registry's literal haystack.includes(q), not tokenized search.
      const matching = rows.filter((row) =>
        `${row.domain} ${row.name} ${row.description}`.toLowerCase().includes(query),
      );
      return json({ results: matching.slice(offset, offset + Number(url.searchParams.get("limit"))) });
    }) as typeof fetch;
    const found = await catalogAi.searchIntegrationCatalog({ query: "acme", kind: "mcp", page: 1 });
    expect(found.items.map((item) => item.domain)).toEqual(["acme.test"]);
    const result = await runInWorkspace(workspace, () =>
      catalogAi.prepareIntegrationSetup({
        kind: "mcp",
        domain: found.items[0].domain,
        slug: "acme",
      }),
    );
    expect(result.status).toBe("user_action_required");
    expect(searches).toEqual([
      { query: "acme", offset: 40 },
      { query: "acme.test", offset: 0 },
      { query: "acme.test", offset: 40 },
    ]);
  });

  test("bounds exact-domain lookup and rejects URL-shaped domains before search", async () => {
    let searches = 0;
    globalThis.fetch = mock(async () => {
      searches++;
      return json({
        results: Array.from({ length: 40 }, (_, index) => ({
          domain: `other-${index}.test`,
          name: "Other",
          description: "acme.test",
          surfaces: [{ kind: "mcp", url: "https://other.test/mcp" }],
        })),
      });
    }) as typeof fetch;
    await expect(catalogAi.prepareIntegrationSetup({ kind: "mcp", domain: "acme.test:443" })).rejects.toThrow(
      "exact catalog domain",
    );
    expect(searches).toBe(0);
    await expect(catalogAi.prepareIntegrationSetup({ kind: "mcp", domain: "acme.test" })).rejects.toThrow(
      "exceeded 1,000 results",
    );
    expect(searches).toBe(25);
  });

  test("rejects credential-like query parameters from AI input and output", async () => {
    globalThis.fetch = mock(async () => json(completedHandoff())) as typeof fetch;
    await expect(
      catalogAi.prepareIntegrationSetup({ kind: "mcp", endpoint: "https://example.test/mcp?access_token=secret" }),
    ).rejects.toThrow("enter credentials privately in Add Connection");
    await expect(
      catalogAi.prepareIntegrationSetup({ kind: "mcp", endpoint: "https://example.test/mcp?token=secret" }),
    ).rejects.toThrow("enter credentials privately in Add Connection");
    await expect(
      catalogAi.prepareIntegrationSetup({ kind: "mcp", endpoint: "https://example.test/mcp?key=secret" }),
    ).rejects.toThrow("enter credentials privately in Add Connection");
  });

  test("opens custom setup without executing a provider tool or creating an integration", async () => {
    let calls = 0;
    globalThis.fetch = mock(async () => {
      calls++;
      throw new Error("Unexpected API call");
    }) as typeof fetch;
    const result = await runInWorkspace(workspace, () =>
      catalogAi.prepareIntegrationSetup({ kind: "mcp", endpoint: "https://example.test/mcp" }),
    );
    expect(result.status).toBe("user_action_required");
    expect(calls).toBe(0);
    expect(raycastState.launches.at(-1)).toEqual({
      name: "add-integration",
      type: "userInitiated",
      context: {
        workspaceId: workspace.id,
        integrationSetup: {
          kind: "mcp",
          domain: undefined,
          catalogSlug: undefined,
          endpoint: "https://example.test/mcp",
        },
      },
    });
  });
});
