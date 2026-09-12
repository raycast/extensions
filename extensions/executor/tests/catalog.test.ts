import { describe, expect, test } from "bun:test";
import "./raycast-mock";
const { catalogPage, CATALOG_PAGE_SIZE, endpointUrl, integrationSetupPath, isUrlInput, searchCatalog } =
  await import("../src/lib/catalog");
const { scopedConsoleUrl } = await import("../src/lib/console");

describe("integration catalog", () => {
  test("keeps provider variants and bases pagination on raw registry count", () => {
    const results = Array.from({ length: CATALOG_PAGE_SIZE - 1 }, () => ({
      domain: "cli.test",
      description: "CLI",
      kinds: ["cli"],
    }));
    results.push({ domain: "app.test", description: "An app", kinds: ["mcp", "openapi"] });
    const page = catalogPage({ results });
    expect(page.hasMore).toBe(true);
    expect(page.data.map((item) => item.kind)).toEqual(["mcp", "openapi"]);
    expect(catalogPage({ results }, "mcp").data).toHaveLength(1);
    expect(() => catalogPage({})).toThrow();
  });

  test("does not transmit pasted endpoint strings to public search", async () => {
    for (const text of [
      "https://private.test/mcp?token=test",
      "private.test",
      "localhost:4788/mcp",
      "file:///secret",
      "private/path",
    ]) {
      expect(isUrlInput(text)).toBe(true);
      expect(await searchCatalog(text, undefined, 0)).toEqual({ data: [], hasMore: false });
    }
    expect(isUrlInput("Google Calendar")).toBe(false);
    expect(endpointUrl("localhost:4788/mcp")).toBe("https://localhost:4788/mcp");
    expect(endpointUrl("http://127.0.0.1:4788/mcp")).toBe("http://127.0.0.1:4788/mcp");
    expect(endpointUrl("https://user:secret@example.com")).toBeUndefined();
  });

  test("preserves setup namespace, authentication guidance and spec patches", () => {
    const path = integrationSetupPath("graphql", {
      url: "https://api.example.com/graphql",
      slug: "example",
      auth: { kind: "api-key", header: "Authorization: {token}", note: "No prefix" },
      specOverrides: [{ op: "remove", path: "/security" }],
    });
    const url = new URL(path, "https://executor.sh");
    expect(url.pathname).toBe("/integrations/add/graphql");
    expect(url.searchParams.get("namespace")).toBe("example");
    expect(url.searchParams.get("authHeader")).toBe("Authorization: {token}");
    expect(JSON.parse(url.searchParams.get("specOverrides")!)).toEqual([{ op: "remove", path: "/security" }]);
    expect(() => integrationSetupPath("mcp", { url: "javascript:alert(1)" })).toThrow();
  });

  test("pins browser routes to the API principal workspace", () => {
    const handoff = "https://executor.sh/personal/integrations/executor?addAccount=1";
    expect(scopedConsoleUrl(handoff, "https://executor.sh", "/artifacts/art_123")).toBe(
      "https://executor.sh/personal/artifacts/art_123",
    );
    expect(
      scopedConsoleUrl(handoff, "https://executor.sh", "/integrations/add/mcp?url=https%3A%2F%2Fexample.com"),
    ).toContain("/personal/integrations/add/mcp?");
    expect(() => scopedConsoleUrl(handoff, "https://other.test", "/artifacts/a")).toThrow();
    expect(() => scopedConsoleUrl(handoff, "https://executor.sh", "//other.test")).toThrow();
    expect(() => scopedConsoleUrl(handoff, "https://executor.sh", "/../other-workspace/artifacts")).toThrow();
    expect(
      scopedConsoleUrl("http://127.0.0.1:4788/integrations/executor", "http://127.0.0.1:4788", "/artifacts/a"),
    ).toBe("http://127.0.0.1:4788/artifacts/a");
  });
});
