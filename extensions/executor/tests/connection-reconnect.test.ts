import { afterEach, beforeAll, expect, mock, test } from "bun:test";
import "./raycast-mock";
let startOAuthReconnect: typeof import("../src/lib/connection-reconnect").startOAuthReconnect;
let reconnectExecutorConnection: typeof import("../src/lib/connection-ai").reconnectExecutorConnection;
beforeAll(async () => {
  ({ startOAuthReconnect } = await import("../src/lib/connection-reconnect"));
  ({ reconnectExecutorConnection } = await import("../src/lib/connection-ai"));
});
import type { Connection } from "../src/lib/types";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});
const connection: Connection = {
  integration: "supabase",
  owner: "user",
  name: "personal",
  template: "oauth2",
  address: "tools.supabase.user.personal",
  provider: "oauth",
  identityLabel: "Personal",
  oauthClient: "dcr-api-supabase-com",
  oauthClientOwner: "user",
  missingOAuthScopes: [],
};
const method = {
  id: "oauth2",
  kind: "oauth",
  template: "oauth2",
  label: "OAuth",
  oauth: { discoveryUrl: "https://mcp.supabase.com/mcp", supportsDynamicRegistration: true },
};
const stored = {
  owner: "user",
  slug: "dcr-api-supabase-com",
  grant: "authorization_code",
  resource: "https://old.example/mcp",
  origin: { kind: "dynamic_client_registration" },
};
const probe = {
  issuer: "https://api.supabase.com",
  authorizationUrl: "https://api.supabase.com/v1/oauth/authorize",
  tokenUrl: "https://api.supabase.com/v1/oauth/token",
  resource: "https://mcp.supabase.com/mcp",
  registrationEndpoint: "https://api.supabase.com/platform/oauth/apps/register",
  scopesSupported: ["projects:read"],
  tokenEndpointAuthMethodsSupported: ["client_secret_basic"],
  clientIdMetadataDocumentSupported: false,
};
type Call = { path: string; body?: Record<string, unknown> };
function fixture(
  options: {
    client?: Record<string, unknown>;
    method?: Record<string, unknown>;
    probe?: Record<string, unknown>;
    failAt?: string;
    onCall?: (path: string) => void;
  } = {},
) {
  const calls: Call[] = [];
  globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = new URL(String(input)).pathname;
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ path, body });
    options.onCall?.(path);
    if (path === options.failAt) return Response.json({ message: "Denied" }, { status: 403 });
    if (path === "/api/connections") return Response.json([connection]);
    if (path === "/api/integrations/supabase")
      return Response.json({ slug: "supabase", authMethods: [options.method ?? method] });
    if (path === "/api/oauth/clients") return Response.json([options.client ?? stored]);
    if (path === "/api/oauth/probe") return Response.json(options.probe ?? probe);
    if (path === "/api/oauth/clients/register-dynamic") return Response.json({ client: "dcr-api-supabase-com-2" });
    if (path === "/api/oauth/start")
      return Response.json({
        status: "redirect",
        authorizationUrl: "https://api.supabase.com/v1/oauth/authorize?state=synthetic",
      });
    throw new Error(`Unexpected request: ${path}`);
  }) as typeof fetch;
  return calls;
}

test("Supabase reconnect probes, registers and starts the same connection with the server-returned client", async () => {
  const calls = fixture();
  const result = await startOAuthReconnect(connection);
  expect(result?.status).toBe("redirect");
  expect(calls.filter((c) => c.body).map((c) => c.path)).toEqual([
    "/api/oauth/probe",
    "/api/oauth/clients/register-dynamic",
    "/api/oauth/start",
  ]);
  expect(calls.find((c) => c.path.endsWith("register-dynamic"))?.body).toEqual({
    owner: "user",
    slug: "dcr-api-supabase-com",
    issuer: probe.issuer,
    registrationEndpoint: probe.registrationEndpoint,
    authorizationUrl: probe.authorizationUrl,
    tokenUrl: probe.tokenUrl,
    resource: probe.resource,
    scopes: ["projects:read"],
    tokenEndpointAuthMethodsSupported: ["client_secret_basic"],
    clientName: "Executor",
    redirectUri: "https://executor.test/api/oauth/callback",
    originIntegration: "supabase",
  });
  expect(calls.at(-1)?.body).toEqual({
    client: "dcr-api-supabase-com-2",
    clientOwner: "user",
    owner: "user",
    name: "personal",
    integration: "supabase",
    template: "oauth2",
    identityLabel: "Personal",
    redirectUri: "https://executor.test/api/oauth/callback",
  });
});

test("AI reconnect uses the same automatic route without an Executor UI handoff", async () => {
  const calls = fixture();
  const result = await reconnectExecutorConnection({ owner: "user", integration: "supabase", connection: "personal" });
  expect(result).toMatchObject({
    status: "browser_action_required",
    pending: true,
    url: expect.stringContaining("https://api.supabase.com/"),
  });
  expect(calls.filter((c) => c.path === "/api/oauth/start")).toHaveLength(1);
});

test("re-registration preserves an absent resource and declared scopes", async () => {
  const calls = fixture({
    client: { ...stored, resource: null },
    method: { ...method, oauth: { ...method.oauth, scopes: ["projects:write"] } },
  });
  await startOAuthReconnect(connection);
  expect(calls.find((c) => c.path.endsWith("register-dynamic"))?.body).toMatchObject({
    resource: null,
    scopes: ["projects:write"],
  });
});

test("a stored resource survives when discovery does not advertise one", async () => {
  const calls = fixture({ probe: { ...probe, resource: null } });
  await startOAuthReconnect(connection);
  expect(calls.find((c) => c.path.endsWith("register-dynamic"))?.body?.resource).toBe(stored.resource);
});

test("manual apps on discovery-capable integrations are never dynamically replaced", async () => {
  const calls = fixture({ client: { ...stored, origin: { kind: "manual" } } });
  await startOAuthReconnect(connection);
  expect(calls.filter((c) => c.body).map((c) => c.path)).toEqual(["/api/oauth/start"]);
  expect(calls.at(-1)?.body?.client).toBe(connection.oauthClient);
});

test("unknown origin, wrong app owner and enterprise auth retain browser setup without registration", async () => {
  for (const options of [
    { client: { ...stored, origin: undefined } },
    { client: { ...stored, owner: "org" } },
    {
      method: {
        ...method,
        oauth: { ...method.oauth, enterpriseIdentityProvider: { client: "enterprise", clientOwner: "org" } },
      },
    },
  ]) {
    const calls = fixture(options);
    expect(await startOAuthReconnect(connection)).toBeUndefined();
    expect(calls.filter((c) => c.body)).toHaveLength(0);
  }
});

test("unsupported discovery falls back before any client registration", async () => {
  for (const changedProbe of [
    { ...probe, registrationEndpoint: null },
    { ...probe, clientIdMetadataDocumentSupported: true },
  ]) {
    const calls = fixture({ probe: changedProbe });
    expect(await startOAuthReconnect(connection)).toBeUndefined();
    expect(calls.filter((c) => c.body).map((c) => c.path)).toEqual(["/api/oauth/probe"]);
  }
});

test("API errors stop the sequence without retrying or switching to a handoff", async () => {
  for (const path of [
    "/api/oauth/clients",
    "/api/oauth/probe",
    "/api/oauth/clients/register-dynamic",
    "/api/oauth/start",
  ]) {
    const calls = fixture({ failAt: path });
    await expect(startOAuthReconnect(connection)).rejects.toThrow();
    expect(calls.filter((c) => c.path === path)).toHaveLength(1);
    expect(calls.at(-1)?.path).toBe(path);
  }
});

test("closing the native view after discovery or registration stops the next side effect", async () => {
  for (const closeAt of ["/api/oauth/probe", "/api/oauth/clients/register-dynamic"]) {
    let active = true;
    const calls = fixture({
      onCall: (path) => {
        if (path === closeAt) active = false;
      },
    });
    await expect(startOAuthReconnect(connection, () => active)).rejects.toThrow("view closed");
    expect(calls.at(-1)?.path).toBe(closeAt);
    expect(calls.some((c) => c.path === "/api/oauth/start")).toBe(false);
  }
});
