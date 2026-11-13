import { beforeEach, describe, expect, mock, test } from "bun:test";
import "./raycast-mock";
import { raycastState } from "./raycast-mock";
import type { CatalogItem } from "../src/lib/catalog";
import type { IntegrationSetupInput } from "../src/lib/integration-setup";
import type { Workspace } from "../src/lib/workspaces";

const {
  createIntegration,
  normalizeIntegrationSetupInput,
  previewIntegration,
  resolveIntegrationSetupDefaults,
  slugifyIntegrationName,
} = await import("../src/lib/integration-setup");
const { runInWorkspace, workspaceIdFor } = await import("../src/lib/workspaces");

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
}

function integration(slug: string, kind: string) {
  return {
    slug,
    name: "Example MCP",
    description: "Example",
    kind,
    canRemove: true,
    canRefresh: true,
    authMethods: [],
  };
}

const input: IntegrationSetupInput = {
  kind: "mcp",
  endpoint: "https://mcp.example.com/mcp",
  name: "Example MCP",
  slug: "example_mcp",
  description: "Example tools",
};

const probe = {
  connected: true,
  requiresAuthentication: false,
  requiresOAuth: false,
  supportsDynamicRegistration: false,
  name: "Example",
  slug: "example",
  toolCount: 3,
  serverName: "Example",
  instructions: "Example tools",
};

beforeEach(() => {
  raycastState.preferences = { apiKey: "test-key", baseUrl: "https://executor.test", defaultOwner: "user" };
});

describe("native integration setup", () => {
  test("uses Executor namespace normalization and accepts raw OpenAPI specs", () => {
    expect(slugifyIntegrationName("My Service API")).toBe("my_service_api");
    expect(
      normalizeIntegrationSetupInput({
        kind: "openapi",
        endpoint: "openapi: 3.1.0\ninfo:\n  title: Example",
        name: "Example API",
        slug: "example_api",
      }).endpoint,
    ).toStartWith("openapi:");
    expect(() =>
      normalizeIntegrationSetupInput({ ...input, endpoint: "https://example.com/mcp?token=secret" }),
    ).toThrow("query parameters");
    expect(() =>
      normalizeIntegrationSetupInput({
        ...input,
        kind: "graphql",
        authentication: { kind: "oauth2" },
      }),
    ).toThrow("supported for MCP");
  });

  test("preserves catalog identity, auth metadata, spec overrides, and non-secret catalog URLs", async () => {
    const item: CatalogItem = {
      id: "example.com:openapi:example",
      domain: "example.com",
      title: "Example API",
      description: "Example catalog API",
      kind: "openapi",
      slug: "example",
      url: "https://example.com/openapi.json?version=2",
      auth: { kind: "api-key", header: "Authorization: Bearer {token}", note: "Use a token." },
      specOverrides: [{ op: "remove", path: "/security" }],
    };
    const result = await resolveIntegrationSetupDefaults({}, item);
    expect(result).toMatchObject({
      kind: "openapi",
      endpoint: item.url,
      name: item.title,
      slug: item.slug,
      catalog: { domain: item.domain, auth: item.auth, specOverrides: item.specOverrides },
    });
    expect(normalizeIntegrationSetupInput(result).endpoint).toBe(item.url!);
  });

  test("probes, reviews, and creates one MCP integration in the captured workspace", async () => {
    const calls: { url: string; method: string; body?: Record<string, unknown>; authorization: string | null }[] = [];
    const responses = [json(probe), json([]), json({ slug: input.slug }), json([integration(input.slug, "mcp")])];
    globalThis.fetch = mock(async (requestUrl, init) => {
      calls.push({
        url: String(requestUrl),
        method: init?.method ?? "GET",
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
        authorization: new Headers(init?.headers).get("authorization"),
      });
      return responses.shift()!;
    }) as typeof fetch;
    const workspace: Workspace = {
      id: workspaceIdFor("https://workspace.executor.test", "workspace-key"),
      name: "Captured",
      baseUrl: "https://workspace.executor.test",
      apiKey: "workspace-key",
    };
    const result = await runInWorkspace(workspace, async () => {
      const preview = await previewIntegration(input);
      return createIntegration(input, preview);
    });
    expect(result).toEqual({ slug: input.slug, name: input.name, kind: "mcp" });
    expect(calls.map((call) => [new URL(call.url).pathname, call.method])).toEqual([
      ["/api/mcp/probe", "POST"],
      ["/api/integrations", "GET"],
      ["/api/mcp/servers", "POST"],
      ["/api/integrations", "GET"],
    ]);
    expect(calls.every((call) => call.url.startsWith(workspace.baseUrl))).toBe(true);
    expect(calls.every((call) => call.authorization === "Bearer workspace-key")).toBe(true);
    expect(calls[2]?.body).toMatchObject({
      transport: "remote",
      endpoint: input.endpoint,
      slug: input.slug,
      authenticationTemplate: [{ kind: "none" }],
    });
  });

  test("stops on slug collision without attempting a save", async () => {
    const methods: string[] = [];
    globalThis.fetch = mock(async (_url, init) => {
      methods.push(init?.method ?? "GET");
      return methods.length === 1 ? json(probe) : json([integration(input.slug, "mcp")]);
    }) as typeof fetch;
    const preview = await previewIntegration(input);
    await expect(createIntegration(input, preview)).rejects.toThrow("already exists");
    expect(methods).toEqual(["POST", "GET"]);
  });

  test("rejects a changed setup before any save request", async () => {
    const paths: string[] = [];
    globalThis.fetch = mock(async (url) => {
      paths.push(new URL(String(url)).pathname);
      return json(probe);
    }) as typeof fetch;
    const preview = await previewIntegration(input);
    await expect(createIntegration({ ...input, name: "Changed MCP" }, preview)).rejects.toThrow(
      "changed after validation",
    );
    expect(paths).toEqual(["/api/mcp/probe"]);
  });

  test("does not retry an Executor denial", async () => {
    let calls = 0;
    globalThis.fetch = mock(async () => {
      calls += 1;
      return json({ _tag: "OrgWriteDeniedError" }, 403);
    }) as typeof fetch;
    await expect(previewIntegration(input)).rejects.toThrow("does not have permission");
    expect(calls).toBe(1);
  });

  test("does not retry or verify after an unexpected create response", async () => {
    const paths: string[] = [];
    const responses = [json(probe), json([]), json({ slug: "wrong_slug" })];
    globalThis.fetch = mock(async (url) => {
      paths.push(new URL(String(url)).pathname);
      return responses.shift()!;
    }) as typeof fetch;
    const preview = await previewIntegration(input);
    await expect(createIntegration(input, preview)).rejects.toThrow("may have added");
    expect(paths).toEqual(["/api/mcp/probe", "/api/integrations", "/api/mcp/servers"]);
  });

  test("reports partial save verification without posting again", async () => {
    const methods: string[] = [];
    const responses = [json(probe), json([]), json({ slug: input.slug }), json([])];
    globalThis.fetch = mock(async (_url, init) => {
      methods.push(init?.method ?? "GET");
      return responses.shift()!;
    }) as typeof fetch;
    const preview = await previewIntegration(input);
    await expect(createIntegration(input, preview)).rejects.toThrow("may have added");
    expect(methods.filter((method) => method === "POST")).toHaveLength(2);
    expect(methods).toEqual(["POST", "GET", "POST", "GET"]);
  });

  test("previews raw OpenAPI and preserves detected and catalog auth in the create payload", async () => {
    const spec = '{"openapi":"3.1.0","info":{"title":"Example","version":"1"},"paths":{}}';
    const apiInput: IntegrationSetupInput = {
      kind: "openapi",
      endpoint: spec,
      name: "Example API",
      slug: "example_api",
      catalog: {
        domain: "example.com",
        auth: { kind: "api-key", header: "Authorization: Bearer {token}" },
        specOverrides: [{ op: "remove", path: "/security" }],
      },
    };
    const previewBody = {
      title: "Example",
      servers: [{ url: "https://api.example.com" }],
      operationCount: 2,
      tags: [],
      headerPresets: [{ label: "X API Key", headers: { "X-API-Key": null }, secretHeaders: ["X-API-Key"] }],
      oauth2Presets: [],
    };
    const bodies: Record<string, unknown>[] = [];
    const responses = [
      json(previewBody),
      json([]),
      json({ slug: apiInput.slug, toolCount: 2 }),
      json([integration(apiInput.slug, "openapi")]),
    ];
    globalThis.fetch = mock(async (_url, init) => {
      if (init?.body) bodies.push(JSON.parse(String(init.body)));
      return responses.shift()!;
    }) as typeof fetch;
    const preview = await previewIntegration(apiInput);
    await createIntegration(apiInput, preview);
    expect(bodies[0]).toEqual({ spec, specOverrides: apiInput.catalog?.specOverrides });
    expect(bodies[1]).toMatchObject({
      spec: { kind: "blob", value: spec },
      displayDomain: "example.com",
      specOverrides: apiInput.catalog?.specOverrides,
    });
    expect(bodies[1]?.authenticationTemplate as unknown[]).toHaveLength(2);
  });

  test("keeps colliding OpenAPI credential variables distinct and resolves OAuth against server defaults", async () => {
    const apiInput: IntegrationSetupInput = {
      kind: "openapi",
      endpoint: "https://specs.example.com/openapi.json",
      name: "Example API",
      slug: "example_api",
      catalog: {
        domain: "example.com",
        auth: { kind: "api-key", header: "Authorization: Bearer {token}" },
      },
    };
    const bodies: Record<string, unknown>[] = [];
    const responses = [
      json({
        servers: [
          {
            url: "https://{region}.api.example.com/v1",
            variables: { region: { default: "us" } },
          },
        ],
        operationCount: 2,
        tags: [],
        headerPresets: [
          {
            label: "API keys",
            headers: { "X-API-Key": null },
            secretHeaders: ["X-API-Key"],
            secretQueryParams: ["x_api_key"],
          },
        ],
        oauth2Presets: [
          {
            label: "OAuth",
            securitySchemeName: "oauth",
            flow: "authorizationCode",
            authorizationUrl: "/oauth/authorize",
            tokenUrl: "/oauth/token",
            scopes: { read: "Read" },
            identityScopes: false,
          },
        ],
      }),
      json([]),
      json({ slug: apiInput.slug, toolCount: 2 }),
      json([integration(apiInput.slug, "openapi")]),
    ];
    globalThis.fetch = mock(async (_url, init) => {
      if (init?.body) bodies.push(JSON.parse(String(init.body)));
      return responses.shift()!;
    }) as typeof fetch;
    await createIntegration(apiInput, await previewIntegration(apiInput));
    const methods = bodies[1]?.authenticationTemplate as Record<string, unknown>[];
    expect(methods[0]).toMatchObject({
      headers: { "X-API-Key": [{ type: "variable", name: "x_api_key" }] },
      queryParams: { x_api_key: [{ type: "variable", name: "x_api_key_2" }] },
    });
    expect(methods[1]).toMatchObject({
      authorizationUrl: "https://us.api.example.com/oauth/authorize",
      tokenUrl: "https://us.api.example.com/oauth/token",
    });
  });

  test("rejects relative OAuth when an OpenAPI server variable has no default", async () => {
    const apiInput: IntegrationSetupInput = {
      kind: "openapi",
      endpoint: "https://specs.example.com/openapi.json",
      name: "Example API",
      slug: "example_api",
      catalog: { domain: "example.com", auth: { kind: "api-key", header: "X-Key: {token}" } },
    };
    const bodies: Record<string, unknown>[] = [];
    const responses = [
      json({
        servers: [{ url: "https://{region}.api.example.com" }],
        operationCount: 1,
        tags: [],
        headerPresets: [],
        oauth2Presets: [
          {
            label: "OAuth",
            securitySchemeName: "oauth",
            flow: "authorizationCode",
            authorizationUrl: "/authorize",
            tokenUrl: "/token",
            scopes: {},
            identityScopes: false,
          },
        ],
      }),
      json([]),
    ];
    const paths: string[] = [];
    globalThis.fetch = mock(async (_url, init) => {
      paths.push(new URL(String(_url)).pathname);
      if (init?.body) bodies.push(JSON.parse(String(init.body)));
      return responses.shift()!;
    }) as typeof fetch;
    await expect(createIntegration(apiInput, await previewIntegration(apiInput))).rejects.toThrow(
      "template variables have defaults",
    );
    expect(paths).toEqual(["/api/openapi/preview", "/api/integrations"]);
    expect(bodies).toHaveLength(1);
  });

  test("shared boundaries reject unsupported catalog auth before reads or writes", async () => {
    const unsupported: IntegrationSetupInput = {
      kind: "graphql",
      endpoint: "https://graphql.example.com/graphql",
      name: "Example GraphQL",
      slug: "example_graphql",
      catalog: { domain: "example.com", auth: { kind: "oauth2" } },
    };
    let calls = 0;
    globalThis.fetch = mock(async () => {
      calls += 1;
      return json([]);
    }) as typeof fetch;
    await expect(previewIntegration(unsupported)).rejects.toThrow("advanced setup");
    await expect(
      createIntegration(unsupported, {
        kind: "graphql",
        fingerprint: "forged",
        result: { deferredUntilConnection: true },
      }),
    ).rejects.toThrow("advanced setup");
    expect(calls).toBe(0);
  });

  test("explicit authentication replaces an incomplete catalog hint", async () => {
    const replacement: IntegrationSetupInput = {
      kind: "graphql",
      endpoint: "https://graphql.example.com/graphql",
      name: "Example GraphQL",
      slug: "example_graphql",
      authentication: { kind: "apiKey", carrier: "header", name: "X-API-Key", prefix: "" },
      catalog: { domain: "example.com", auth: { kind: "api-key" } },
    };
    const bodies: Record<string, unknown>[] = [];
    const responses = [
      json([]),
      json({ slug: replacement.slug, name: replacement.name }),
      json([integration(replacement.slug, "graphql")]),
    ];
    globalThis.fetch = mock(async (_url, init) => {
      if (init?.body) bodies.push(JSON.parse(String(init.body)));
      return responses.shift()!;
    }) as typeof fetch;
    await createIntegration(replacement, await previewIntegration(replacement));
    expect(bodies[0]?.authenticationTemplate).toEqual([
      {
        type: "apiKey",
        label: "API key header",
        headers: { "X-API-Key": [{ type: "variable", name: "token" }] },
      },
    ]);
  });

  test("OpenAPI catalog API key without a header defers to spec detection", async () => {
    const apiInput: IntegrationSetupInput = {
      kind: "openapi",
      endpoint: "https://specs.example.com/openapi.json",
      name: "Example API",
      slug: "example_api",
      catalog: { domain: "example.com", auth: { kind: "api-key" } },
    };
    const bodies: Record<string, unknown>[] = [];
    const responses = [
      json({
        servers: [{ url: "https://api.example.com" }],
        operationCount: 1,
        tags: [],
        headerPresets: [
          {
            label: "Bearer token",
            headers: { Authorization: null },
            secretHeaders: ["Authorization"],
          },
        ],
        oauth2Presets: [],
      }),
      json([]),
      json({ slug: apiInput.slug, toolCount: 1 }),
      json([integration(apiInput.slug, "openapi")]),
    ];
    globalThis.fetch = mock(async (_url, init) => {
      if (init?.body) bodies.push(JSON.parse(String(init.body)));
      return responses.shift()!;
    }) as typeof fetch;
    await createIntegration(apiInput, await previewIntegration(apiInput));
    expect(bodies[0]).toEqual({ spec: apiInput.endpoint });
    expect(bodies[1]).not.toHaveProperty("authenticationTemplate");
  });

  test("OpenAPI catalog authentication fails when the spec detects no supported method", async () => {
    const apiInput: IntegrationSetupInput = {
      kind: "openapi",
      endpoint: "https://specs.example.com/openapi.json",
      name: "Example API",
      slug: "example_api",
      catalog: { domain: "example.com", auth: { kind: "api-key" } },
    };
    const methods: string[] = [];
    globalThis.fetch = mock(async (_url, init) => {
      methods.push(init?.method ?? "GET");
      if (methods.length === 1) {
        return json({
          servers: [{ url: "https://api.example.com" }],
          operationCount: 1,
          tags: [],
          headerPresets: [],
          oauth2Presets: [],
        });
      }
      return json([]);
    }) as typeof fetch;
    const preview = await previewIntegration(apiInput);
    await expect(createIntegration(apiInput, preview)).rejects.toThrow(
      "did not declare a supported authentication method",
    );
    expect(methods).toEqual(["POST", "GET"]);

    const oauthInput: IntegrationSetupInput = {
      ...apiInput,
      slug: "example_oauth",
      catalog: { domain: "example.com", auth: { kind: "oauth2" } },
    };
    methods.length = 0;
    const oauthPreview = await previewIntegration(oauthInput);
    await expect(createIntegration(oauthInput, oauthPreview)).rejects.toThrow(
      "did not declare a supported authentication method",
    );
    expect(methods).toEqual(["POST", "GET"]);
  });

  test("treats catalog oauth2 as MCP OAuth instead of no authentication", async () => {
    const oauthInput: IntegrationSetupInput = {
      ...input,
      catalog: { domain: "example.com", auth: { kind: "oauth2" } },
    };
    const bodies: Record<string, unknown>[] = [];
    const responses = [json(probe), json([]), json({ slug: input.slug }), json([integration(input.slug, "mcp")])];
    globalThis.fetch = mock(async (_url, init) => {
      if (init?.body) bodies.push(JSON.parse(String(init.body)));
      return responses.shift()!;
    }) as typeof fetch;
    await createIntegration(oauthInput, await previewIntegration(oauthInput));
    expect(bodies[1]?.authenticationTemplate).toEqual([{ kind: "oauth2" }]);
  });

  test("registers protected GraphQL for lazy discovery without calling the endpoint", async () => {
    const gqlInput: IntegrationSetupInput = {
      kind: "graphql",
      endpoint: "https://graphql.example.com/graphql",
      name: "Example GraphQL",
      slug: "example_graphql",
      authentication: { kind: "apiKey", carrier: "header", name: "Authorization", prefix: "Bearer " },
    };
    const calls: { path: string; body?: Record<string, unknown> }[] = [];
    globalThis.fetch = mock(async (url, init) => {
      const parsed = new URL(String(url));
      calls.push({ path: parsed.pathname, body: init?.body ? JSON.parse(String(init.body)) : undefined });
      if (parsed.pathname === "/api/integrations" && calls.filter((call) => call.path === parsed.pathname).length === 1)
        return json([]);
      if (parsed.pathname === "/api/integrations") return json([integration(gqlInput.slug, "graphql")]);
      return json({ slug: gqlInput.slug, name: gqlInput.name });
    }) as typeof fetch;
    const preview = await previewIntegration(gqlInput);
    expect(preview).toMatchObject({ kind: "graphql", result: { deferredUntilConnection: true } });
    await createIntegration(gqlInput, preview);
    expect(calls.map((call) => call.path)).toEqual([
      "/api/integrations",
      "/api/graphql/integrations",
      "/api/integrations",
    ]);
    expect(calls[1]?.body).not.toHaveProperty("introspectionJson");
    expect(calls[1]?.body?.authenticationTemplate).toEqual([
      {
        type: "apiKey",
        label: "Bearer token",
        headers: { Authorization: ["Bearer ", { type: "variable", name: "token" }] },
      },
    ]);
  });
});
