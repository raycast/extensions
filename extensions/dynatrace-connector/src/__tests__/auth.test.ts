// src/__tests__/auth.test.ts
// Unit tests for OAuth 2.0 token service.

import type { TenantConfig } from "../lib/auth";

const TENANT: TenantConfig = {
  id: "test-tenant",
  name: "Test",
  tenantEndpoint: "https://test.live.dynatrace.com",
  clientId: "test-client-id",
  clientSecret: "test-client-secret",
  ssoEndpoint: "https://sso.dynatrace.com/sso/oauth2/token",
  scopes: ["storage:logs:read"],
};

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockTokenResponse(access_token = "test-token", expires_in = 300) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    text: async () => JSON.stringify({ access_token, expires_in }),
  });
}

function mockErrorResponse(status: number, body: string) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    text: async () => body,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  // Reset module registry so tokenCache is re-created fresh for each test
  jest.resetModules();
});

async function loadAuth() {
  return import("../lib/auth");
}

test("getAccessToken returns token on first call", async () => {
  mockTokenResponse("fresh-token", 300);
  const { getAccessToken } = await loadAuth();
  const token = await getAccessToken(TENANT);
  expect(token).toBe("fresh-token");
  expect(mockFetch).toHaveBeenCalledTimes(1);
});

test("getAccessToken uses cache on second call — fetch called only once", async () => {
  mockTokenResponse("cached-token", 600);
  const { getAccessToken } = await loadAuth();
  const token1 = await getAccessToken(TENANT);
  const token2 = await getAccessToken(TENANT);
  expect(token1).toBe("cached-token");
  expect(token2).toBe("cached-token");
  // fetch should have been called only once (second call served from cache)
  expect(mockFetch).toHaveBeenCalledTimes(1);
});

test("getAccessToken throws OAuthError on non-OK response", async () => {
  mockErrorResponse(401, '{"error":"unauthorized"}');
  const { getAccessToken, OAuthError } = await loadAuth();
  await expect(getAccessToken(TENANT)).rejects.toThrow(OAuthError);
});

test("OAuthError redacts client_secret from body", async () => {
  const { OAuthError } = await loadAuth();
  const err = new OAuthError(400, "client_secret=super-secret&grant_type=client_credentials");
  expect(err.message).not.toContain("super-secret");
  expect(err.message).toContain("[REDACTED]");
  expect(err.statusCode).toBe(400);
});
