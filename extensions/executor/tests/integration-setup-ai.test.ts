import { afterEach, expect, mock, test } from "bun:test";
import "./raycast-mock";
const { createAiIntegration, resolveAiIntegrationSetup } = await import("../src/lib/integration-setup-ai");
const { runInWorkspace } = await import("../src/lib/workspaces");
const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("AI creates in the explicit workspace and verifies the exact integration", async () => {
  const calls: { url: string; body?: Record<string, unknown> }[] = [];
  let created = false;
  globalThis.fetch = mock(async (url, init) => {
    const path = new URL(String(url)).pathname;
    calls.push({ url: String(url), body: init?.body ? JSON.parse(String(init.body)) : undefined });
    if (path === "/api/mcp/probe")
      return Response.json({
        connected: true,
        requiresAuthentication: false,
        requiresOAuth: false,
        supportsDynamicRegistration: false,
        name: "Example",
        slug: "example",
        toolCount: 2,
        serverName: "Example",
        instructions: null,
      });
    if (path === "/api/integrations") return Response.json(created ? [{ slug: "example_mcp", kind: "mcp" }] : []);
    if (path === "/api/mcp/servers") {
      created = true;
      return Response.json({ slug: "example_mcp" });
    }
    throw new Error("Unexpected path");
  }) as typeof fetch;
  const result = await runInWorkspace(
    { id: "a".repeat(64), name: "Example", baseUrl: "https://chosen.example", apiKey: "fixture" },
    () => createAiIntegration({ kind: "mcp", endpoint: "https://service.example/mcp", name: "Example MCP" }),
  );
  expect(result.status).toBe("created");
  expect(calls.every((call) => call.url.startsWith("https://chosen.example/"))).toBe(true);
  expect(calls.filter((call) => call.url.endsWith("/servers"))).toHaveLength(1);
  expect(calls.find((call) => call.url.endsWith("/servers"))?.body).toMatchObject({
    name: "Example MCP",
    slug: "example_mcp",
    endpoint: "https://service.example/mcp",
  });
});

test("AI resolves catalog authentication and specification overrides without losing them", async () => {
  globalThis.fetch = mock(async () =>
    Response.json({
      results: [
        {
          domain: "example.test",
          name: "Example",
          description: "Example API",
          surfaces: [
            {
              kind: "openapi",
              slug: "example_api",
              url: "https://example.test/openapi.json",
              auth: { kind: "apikey", header: "Authorization: Bearer {token}" },
              specOverrides: [{ op: "remove", path: "/paths/~1admin" }],
            },
          ],
        },
      ],
    }),
  ) as typeof fetch;
  const setup = await resolveAiIntegrationSetup({
    kind: "openapi",
    domain: "example.test",
    catalogSlug: "example_api",
  });
  expect(setup.catalog?.auth?.header).toBe("Authorization: Bearer {token}");
  expect(setup.catalog?.specOverrides).toEqual([{ op: "remove", path: "/paths/~1admin" }]);
  expect(setup.slug).toBe("example_api");
});

test("AI refuses contradictory targets and supports an explicit OpenAPI document", async () => {
  await expect(
    resolveAiIntegrationSetup({ kind: "mcp", domain: "example.test", endpoint: "https://example.test/mcp" }),
  ).rejects.toThrow("not both");
  const setup = await resolveAiIntegrationSetup({
    kind: "openapi",
    endpoint: '{"openapi":"3.0.0","paths":{}}',
    name: "Example API",
  });
  expect(setup.slug).toBe("example_api");
  expect(setup.endpoint).toContain('"openapi"');
});

test("AI rejects unsupported catalog authentication before probe or registration", async () => {
  const calls: string[] = [];
  globalThis.fetch = mock(async (url) => {
    calls.push(String(url));
    if (String(url).startsWith("https://integrations.sh/"))
      return Response.json({
        results: [
          {
            domain: "example.test",
            name: "Example",
            description: "Custom auth",
            surfaces: [
              { kind: "mcp", slug: "example", url: "https://example.test/mcp", auth: { kind: "custom-session" } },
            ],
          },
        ],
      });
    throw new Error("Unexpected Executor request");
  }) as typeof fetch;
  await expect(createAiIntegration({ kind: "mcp", domain: "example.test", catalogSlug: "example" })).rejects.toThrow(
    "advanced setup",
  );
  expect(calls.every((url) => url.startsWith("https://integrations.sh/"))).toBe(true);
});
