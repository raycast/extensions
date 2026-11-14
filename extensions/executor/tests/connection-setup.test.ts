import { afterEach, expect, mock, test } from "bun:test";
import "./raycast-mock";
const { createNativeConnection, credentialFields, setupOAuthClients, startNativeOAuth } =
  await import("../src/lib/connection-setup");
import type { IntegrationWithAuth, OAuthClientSummary } from "../src/lib/connection-actions";
const original = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = original;
});
const target = { integration: "example", owner: "user" as const, template: "key", label: "Test Account" };
const method = {
  id: "key",
  template: "key",
  kind: "apikey",
  label: "API Key",
  placements: [
    { name: "Authorization" },
    { name: "X-Account", variable: "account" },
    { name: "Version", literal: "1" },
  ],
};
const integration = (m: typeof method | object) => ({ slug: "example", name: "Example", authMethods: [m] });
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });

test("derive distinct credential fields from metadata and reject unsupported shapes", () => {
  expect(credentialFields(method)).toEqual(["token", "account"]);
  expect(credentialFields({ id: "none", template: "none", kind: "none", label: "None" })).toEqual([]);
  expect(credentialFields({ ...method, placements: undefined })).toBeUndefined();
});

test("create preserves scope, supports multiple values, and chooses an unused name", async () => {
  let body: Record<string, unknown> = {};
  globalThis.fetch = mock(async (url, init) => {
    if (String(url).includes("/api/integrations/")) return json(integration(method));
    if (String(url).includes("/api/connections?")) return json([{ name: "test_account" }]);
    body = JSON.parse(String(init?.body));
    return json({ ...body, address: "example.user.test_account_2" });
  }) as typeof fetch;
  const result = await createNativeConnection(target, { token: "secret", account: "account-secret" });
  expect(result.name).toBe("test_account_2");
  expect(body).toMatchObject({
    owner: "user",
    integration: "example",
    template: "key",
    values: { token: "secret", account: "account-secret" },
    identityLabel: "Test Account",
  });
});

test("no-auth creation sends no credential and unexpected credential fields never reach POST", async () => {
  const bodies: unknown[] = [];
  globalThis.fetch = mock(async (url, init) => {
    if (String(url).includes("/api/integrations/"))
      return json(integration({ id: "none", template: "none", kind: "none", label: "None" }));
    if (String(url).includes("/api/connections?")) return json([]);
    const body = JSON.parse(String(init?.body));
    bodies.push(body);
    return json(body);
  }) as typeof fetch;
  await expect(createNativeConnection({ ...target, template: "none" }, { token: "secret" })).rejects.toThrow(
    "required credential fields",
  );
  await createNativeConnection({ ...target, template: "none" }, {});
  expect(bodies).toHaveLength(1);
  expect(bodies[0]).toMatchObject({ values: {}, template: "none" });
});

test("credential errors and malformed responses never expose secrets or retry", async () => {
  let posts = 0;
  globalThis.fetch = mock(async (url) => {
    if (String(url).includes("/api/integrations/")) return json(integration(method));
    if (String(url).includes("/api/connections?")) return json([]);
    posts++;
    return new Response("echoed-secret", { status: 500 });
  }) as typeof fetch;
  let message = "";
  try {
    await createNativeConnection(target, { token: "echoed-secret", account: "account-secret" });
  } catch (error) {
    message = (error as Error).message;
  }
  expect(message).not.toContain("echoed-secret");
  expect(message).toContain("Check Manage Connections");
  expect(posts).toBe(1);
});

const oauth: IntegrationWithAuth["authMethods"][number] = {
  id: "oauth",
  template: "oauth",
  kind: "oauth",
  label: "OAuth",
  oauth: { scopes: ["read"], authorizationUrl: "https://auth.example.com/authorize" },
};
const client: OAuthClientSummary = {
  owner: "org",
  slug: "example-app",
  grant: "authorization_code",
  origin: { kind: "first_party", integrations: ["example"], allowedScopes: ["read"] },
};

test("OAuth matching respects intent, scopes, enterprise and dynamic setup boundaries", () => {
  expect(setupOAuthClients([client], "example", oauth, "user")).toEqual([client]);
  expect(setupOAuthClients([client], "other", oauth, "user")).toEqual([]);
  expect(setupOAuthClients([client], "example", { ...oauth, oauth: { scopes: ["write"] } }, "user")).toEqual([]);
  expect(
    setupOAuthClients(
      [{ ...client, origin: { kind: "dynamic_client_registration", integration: "example" } }],
      "example",
      oauth,
      "user",
    ),
  ).toEqual([]);
  expect(
    setupOAuthClients(
      [client],
      "example",
      {
        ...oauth,
        oauth: { enterpriseIdentityProvider: { client: "sso", clientOwner: "org" } },
      },
      "user",
    ),
  ).toEqual([]);
});

test("OAuth creation rechecks the selected app and requests a new connection", async () => {
  let body: Record<string, unknown> = {};
  globalThis.fetch = mock(async (url, init) => {
    if (String(url).includes("/api/integrations/")) return json(integration(oauth));
    if (String(url).endsWith("/api/oauth/clients")) return json([client]);
    if (String(url).includes("/api/connections?")) return json([]);
    body = JSON.parse(String(init?.body));
    return json({ status: "redirect", authorizationUrl: "https://auth.example.com/authorize" });
  }) as typeof fetch;
  await expect(startNativeOAuth({ ...target, template: "oauth" }, "user/example-app")).rejects.toThrow(
    "no longer available",
  );
  const result = await startNativeOAuth({ ...target, template: "oauth" }, "org/example-app");
  expect(body).toMatchObject({ newConnection: true, owner: "user", clientOwner: "org", client: "example-app" });
  expect(result.url).toBe("https://auth.example.com/authorize");
});

test("agent setup opens a scoped native form without creating a connection or accepting credentials", async () => {
  const { raycastState } = await import("./raycast-mock");
  const { saveWorkspace, workspaceIdFor } = await import("../src/lib/workspaces");
  const { default: addConnection } = await import("../src/tools/add-connection");
  const id = workspaceIdFor("https://native.test", "private-test-key");
  await saveWorkspace({ id, name: "Native", baseUrl: "https://native.test", apiKey: "private-test-key" });
  raycastState.launches = [];
  const methods: string[] = [];
  globalThis.fetch = mock(async (_url, init) => {
    methods.push(init?.method ?? "GET");
    return json(integration(method));
  }) as typeof fetch;
  const result = await addConnection({ ...target, workspaceId: id });
  expect(result.status).toBe("user_action_required");
  expect(methods.every((m) => m === "GET")).toBe(true);
  expect(raycastState.launches[0]).toMatchObject({
    name: "add-connection",
    context: { workspaceId: id, integration: "example", owner: "user", template: "key", label: "Test Account" },
  });
  raycastState.inbox.clear();
});

test("OAuth app ownership matches Executor rules and empty compatibility triggers handoff", () => {
  const personal: OAuthClientSummary = {
    ...client,
    owner: "user",
    origin: { kind: "manual", integration: "example" },
  };
  const workspace: OAuthClientSummary = { ...personal, owner: "org" };
  expect(setupOAuthClients([personal], "example", oauth, "org")).toEqual([]);
  expect(setupOAuthClients([personal], "example", oauth, "user")).toEqual([personal]);
  expect(setupOAuthClients([workspace], "example", oauth, "user")).toEqual([workspace]);
  expect(setupOAuthClients([workspace], "example", oauth, "org")).toEqual([workspace]);
  const firstParty = { ...client, owner: "user" as const };
  expect(setupOAuthClients([firstParty], "example", oauth, "org")).toEqual([firstParty]);
});

test("OAuth execution rejects an incompatible app from a fresh response before POST", async () => {
  const methods: string[] = [];
  globalThis.fetch = mock(async (url, init) => {
    methods.push(init?.method ?? "GET");
    if (String(url).includes("/api/integrations/")) return json(integration(oauth));
    return json([{ ...client, owner: "user", origin: { kind: "manual", integration: "example" } }]);
  }) as typeof fetch;
  await expect(startNativeOAuth({ ...target, owner: "org", template: "oauth" }, "user/example-app")).rejects.toThrow(
    "no longer available",
  );
  expect(methods).toEqual(["GET", "GET"]);
});
