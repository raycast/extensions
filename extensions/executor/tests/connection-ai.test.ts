import { afterEach, beforeAll, describe, expect, mock, test } from "bun:test";

import "./raycast-mock";

type ConnectionAi = typeof import("../src/lib/connection-ai");
let connectionAi: ConnectionAi;
const originalFetch = globalThis.fetch;

beforeAll(async () => {
  connectionAi = await import("../src/lib/connection-ai");
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function json(value: unknown): Response {
  return Response.json(value);
}

function connection(overrides: Record<string, unknown> = {}) {
  return {
    owner: "user",
    name: "main",
    integration: "github",
    template: "oauth",
    provider: "github",
    address: "github.user.main",
    identityLabel: "Personal GitHub",
    description: null,
    expiresAt: null,
    oauthClient: "github-client",
    oauthClientOwner: "org",
    oauthScope: null,
    missingOAuthScopes: [],
    lastHealth: null,
    ...overrides,
  };
}

const integration = {
  slug: "github",
  name: "GitHub",
  description: "GitHub API",
  kind: "openapi",
  canRemove: true,
  canRefresh: true,
  authMethods: [{ id: "oauth", label: "OAuth", kind: "oauth", template: "oauth" }],
};

function completedHandoff(url = "https://executor.test/org/personal/integrations/github") {
  return {
    status: "completed",
    text: "",
    structured: { result: { ok: true, data: { url, instructions: "Continue" } } },
    isError: false,
  };
}

describe("connection AI actions", () => {
  test("confirms and updates only an exact connection target", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    globalThis.fetch = mock(async (request: RequestInfo | URL, init?: RequestInit) => {
      requests.push({ url: String(request), init });
      if (String(request).endsWith("/api/integrations/github"))
        return json({ slug: "github", name: "GitHub Enterprise" });
      return init?.method === "PATCH"
        ? json(connection({ identityLabel: "Work", description: "Issues" }))
        : json([connection()]);
    }) as typeof fetch;

    const input = {
      owner: "user" as const,
      integration: "github",
      connection: "main",
      label: " Work ",
      description: "Issues",
    };
    const confirmation = await connectionAi.updateConnectionConfirmation(input);
    expect(confirmation.info).toContainEqual({ name: "Address", value: "github.user.main" });
    expect(confirmation.info).toContainEqual({ name: "Integration", value: "GitHub Enterprise" });
    expect(confirmation.info).toContainEqual({ name: "Connection Scope", value: "Personal" });
    const result = await connectionAi.updateExecutorConnection(input);
    expect(result.connection.identityLabel).toBe("Work");
    expect(JSON.parse(String(requests.at(-1)?.init?.body))).toEqual({ identityLabel: "Work", description: "Issues" });
  });

  test("rejects a connection name that is not present in the exact owner and integration scope", async () => {
    globalThis.fetch = mock(async () => json([connection()])) as typeof fetch;
    await expect(
      connectionAi.checkExecutorConnection({ owner: "user", integration: "github", connection: "other" }),
    ).rejects.toThrow("exact connection was not found");
  });

  test("runs explicit health and resync endpoints", async () => {
    const urls: string[] = [];
    globalThis.fetch = mock(async (request: RequestInfo | URL, init?: RequestInit) => {
      const url = String(request);
      urls.push(url);
      if (!init?.method) return json([connection()]);
      if (url.endsWith("/health")) return json({ status: "healthy", checkedAt: 1 });
      return json([{ address: "github.user.main.issues_list" }]);
    }) as typeof fetch;

    const target = { owner: "user" as const, integration: "github", connection: "main" };
    expect((await connectionAi.checkExecutorConnection(target)).health.status).toBe("healthy");
    expect((await connectionAi.resyncExecutorConnection(target)).toolCount).toBe(1);
    expect(urls.some((url) => url.endsWith("/health"))).toBe(true);
    expect(urls.some((url) => url.endsWith("/refresh"))).toBe(true);
  });

  test("bounds resync output and directs larger catalogs to discovery", async () => {
    globalThis.fetch = mock(async (request: RequestInfo | URL, init?: RequestInit) => {
      if (!init?.method) return json([connection()]);
      return json(
        Array.from({ length: 25 }, (_, index) => ({
          address: `github.user.main.tool_${index}`,
          owner: "user",
          integration: "github",
          connection: "main",
          name: `tool_${index}`,
          pluginId: "openapi",
          description: "Tool",
        })),
      );
    }) as typeof fetch;
    const result = await connectionAi.resyncExecutorConnection({
      owner: "user",
      integration: "github",
      connection: "main",
    });
    expect(result.toolCount).toBe(25);
    expect(result.toolPreview).toHaveLength(20);
    expect(result.truncated).toBe(true);
    expect(result.nextStep).toContain("discover-tools");
  });

  test("keeps unsupported OAuth clients in the secure Executor browser flow", async () => {
    const urls: string[] = [];
    globalThis.fetch = mock(async (request: RequestInfo | URL) => {
      const url = String(request);
      urls.push(url);
      if (url.includes("/api/connections?")) return json([connection()]);
      if (url.endsWith("/api/integrations/github")) return json(integration);
      if (url.endsWith("/api/oauth/clients")) {
        return json([
          {
            owner: "org",
            slug: "github-client",
            grant: "authorization_code",
            origin: { kind: "dynamic_client_registration" },
          },
        ]);
      }
      return json(completedHandoff());
    }) as typeof fetch;

    const result = await connectionAi.reconnectExecutorConnection({
      owner: "user",
      integration: "github",
      connection: "main",
    });
    expect(result.status).toBe("browser_action_required");
    expect(result.pending).toBe(true);
    expect(urls.some((url) => url.endsWith("/api/oauth/start"))).toBe(false);
  });

  test("uses direct reconnect only for the same protected client route", async () => {
    globalThis.fetch = mock(async (request: RequestInfo | URL) => {
      const url = String(request);
      if (url.includes("/api/connections?")) return json([connection()]);
      if (url.endsWith("/api/integrations/github")) return json(integration);
      if (url.endsWith("/api/oauth/clients")) {
        return json([
          {
            owner: "org",
            slug: "github-client",
            grant: "authorization_code",
            origin: { kind: "first_party", integrations: ["github"] },
          },
        ]);
      }
      return json({ status: "redirect", authorizationUrl: "https://github.com/login/oauth/authorize" });
    }) as typeof fetch;

    const result = await connectionAi.reconnectExecutorConnection({
      owner: "user",
      integration: "github",
      connection: "main",
    });
    expect(result.status).toBe("browser_action_required");
    expect(result.url).toBe("https://github.com/login/oauth/authorize");
  });

  test("returns a pending handoff for a validated new connection setup", async () => {
    globalThis.fetch = mock(async (request: RequestInfo | URL) =>
      String(request).endsWith("/api/integrations/github") ? json(integration) : json(completedHandoff()),
    ) as typeof fetch;
    const result = await connectionAi.startExecutorConnection({
      integration: "github",
      owner: "user",
      template: "oauth",
      label: "Personal",
    });
    expect(result.status).toBe("browser_action_required");
    expect(result.pending).toBe(true);
  });

  test("preserves a server pause from a connection handoff", async () => {
    globalThis.fetch = mock(async (request: RequestInfo | URL) => {
      if (String(request).endsWith("/api/integrations/github")) return json(integration);
      return json({
        status: "paused",
        text: "Execution paused",
        structured: {
          status: "waiting_for_interaction",
          executionId: "connection-setup-1",
          interaction: { kind: "form", message: "Approve handoff?" },
        },
      });
    }) as typeof fetch;
    const result = await connectionAi.startExecutorConnection({
      integration: "github",
      owner: "user",
      template: "oauth",
    });
    expect(result.status).toBe("paused");
    expect(result.executionId).toBe("connection-setup-1");
  });
});
