import { afterEach, expect, test } from "bun:test";
import "./raycast-mock";
const { listDisplayIntegrations } = await import("../src/lib/integration-display");
const { integrationIcon } = await import("../src/lib/integration-icons");
const { runInWorkspace } = await import("../src/lib/workspaces");
const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("OpenAPI branding uses config base URLs and saved domains, not generic spec hosts", async () => {
  const rows = [
    { slug: "base", kind: "openapi", displayUrl: "https://api.example.org" },
    { slug: "saved", kind: "openapi", displayUrl: "https://example.net" },
    { slug: "inline", kind: "openapi", displayUrl: "https://inline.example.org" },
    { slug: "spec", kind: "openapi", displayUrl: "https://raw.githubusercontent.com/unrelated/api/spec.json" },
    { slug: "denied", kind: "openapi", displayUrl: "https://files.example.org/spec" },
    {
      slug: "github",
      kind: "openapi",
      displayUrl:
        "https://raw.githubusercontent.com/github/rest-api-description/main/descriptions/api.github.com/api.github.com.json",
    },
  ];
  const calls: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    calls.push(url.pathname);
    expect(url.origin).toBe("https://gateway.example.org");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer scoped-key");
    if (url.pathname === "/api/integrations") return Response.json(rows);
    if (url.pathname.includes("/denied/")) return Response.json({}, { status: 403 });
    const slug = url.pathname.split("/")[4];
    return Response.json({
      specUrl:
        slug === "inline" ? null : slug === "spec" ? rows[3].displayUrl : "https://specs.example.com/document.json",
      baseUrl: slug === "base" ? "https://api.example.org/v1?secret=synthetic" : null,
      headers: { Authorization: "must-not-be-cached" },
      queryParams: { key: "must-not-be-cached" },
    });
  }) as typeof fetch;
  const result = await runInWorkspace(
    { id: "one", name: "Example", baseUrl: "https://gateway.example.org", apiKey: "scoped-key" },
    () => listDisplayIntegrations(),
  );
  expect(result.map((row) => row.logoDomain)).toEqual([
    "example.org",
    "example.net",
    "example.org",
    null,
    null,
    undefined,
  ]);
  expect(JSON.stringify(result)).not.toContain("must-not-be-cached");
  expect(JSON.stringify(result)).not.toContain("secret=");
  expect(calls).toHaveLength(6);
  const directory = new Map(result.map((row) => [row.slug, row]));
  expect(integrationIcon("spec", directory)).toMatchObject({ source: "plug" });
  expect(integrationIcon("github", directory)).toMatchObject({ source: "https://integrations.sh/logo/github.com" });
});
