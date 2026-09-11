import { describe, it, expect } from "vitest";
import {
  isClerkSecretKey,
  instanceTypeFromKey,
  defaultAppName,
  DASHBOARD_API_KEYS_URL,
  dashboardUserUrl,
  dashboardOrgUrl,
  clientFor,
  pruneClientCache,
} from "./clerk";
import type { ClerkApp } from "../types";

describe("isClerkSecretKey", () => {
  it("accepts test and live keys, trimming whitespace", () => {
    expect(isClerkSecretKey("sk_test_abc123")).toBe(true);
    expect(isClerkSecretKey("  sk_live_XYZ789  ")).toBe(true);
  });
  it("rejects non-keys", () => {
    expect(isClerkSecretKey("pk_test_abc")).toBe(false);
    expect(isClerkSecretKey("hello")).toBe(false);
    expect(isClerkSecretKey("")).toBe(false);
  });
});

describe("instanceTypeFromKey", () => {
  it("maps live keys to production and others to development", () => {
    expect(instanceTypeFromKey("sk_live_abc")).toBe("production");
    expect(instanceTypeFromKey("sk_test_abc")).toBe("development");
  });
});

describe("defaultAppName", () => {
  it("combines instance type with the last 4 characters", () => {
    expect(defaultAppName("sk_live_aaaa1234")).toBe("Production · 1234");
    expect(defaultAppName("sk_test_bbbbWXYZ")).toBe("Development · WXYZ");
  });
});

describe("DASHBOARD_API_KEYS_URL", () => {
  it("points at the Clerk dashboard API keys deep link", () => {
    expect(DASHBOARD_API_KEYS_URL).toBe("https://dashboard.clerk.com/last-active?path=api-keys");
  });
});

describe("dashboard deep links", () => {
  it("builds a user URL", () => {
    expect(dashboardUserUrl("user_123")).toBe("https://dashboard.clerk.com/~/users/user_123");
  });
  it("builds an organization URL", () => {
    expect(dashboardOrgUrl("org_123")).toBe("https://dashboard.clerk.com/~/organizations/org_123");
  });
});

describe("client cache", () => {
  const app: ClerkApp = { id: "x", name: "X", instanceType: "development", secretKey: "sk_test_cache" };

  it("reuses the cached client for the same key", () => {
    const first = clientFor(app);
    expect(clientFor(app)).toBe(first);
  });

  it("evicts clients whose key is no longer valid", () => {
    const first = clientFor(app);
    pruneClientCache(["sk_test_someoneelse"]);
    expect(clientFor(app)).not.toBe(first);
  });

  it("keeps clients whose key is still valid", () => {
    const first = clientFor(app);
    pruneClientCache([app.secretKey]);
    expect(clientFor(app)).toBe(first);
  });
});
