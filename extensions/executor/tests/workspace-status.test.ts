import { afterEach, expect, test } from "bun:test";
import { raycastState } from "./raycast-mock";
const { loadWorkspaceStatus } = await import("../src/lib/workspace-status");
const { saveWorkspace, workspaceIdFor } = await import("../src/lib/workspaces");

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
  raycastState.inbox.clear();
});

test("status metadata belongs to each configured server and survives unavailable integration metadata", async () => {
  const workspace = {
    id: workspaceIdFor("https://gateway.example.org", "synthetic-key"),
    name: "Research Lab",
    baseUrl: "https://gateway.example.org",
    apiKey: "synthetic-key",
  };
  await saveWorkspace(workspace);
  let missingMetadata = false;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    expect(url.origin).toBe(workspace.baseUrl);
    if (url.pathname === "/api/integrations") {
      if (missingMetadata) return Response.json({}, { status: 403 });
      return Response.json([{ slug: "custom_service", name: "QA Lab" }]);
    }
    if (url.pathname === "/api/connections")
      return Response.json([
        {
          integration: "custom_service",
          owner: "org",
          name: "default",
          identityLabel: "QA Automation",
          address: "tools.custom_service.org.default",
          missingOAuthScopes: [],
          lastHealth: { status: "expired" },
        },
      ]);
    throw new Error(`Unexpected request: ${url.pathname}`);
  }) as typeof fetch;
  const status = await loadWorkspaceStatus(workspace.id);
  expect(status.integrations[0].name).toBe("QA Lab");
  expect(status.snapshot.repairConnections[0].identityLabel).toBe("QA Automation");
  missingMetadata = true;
  const fallback = await loadWorkspaceStatus(workspace.id);
  expect(fallback.integrations).toEqual([]);
  expect(fallback.snapshot.needsAttention).toBe(1);
});
