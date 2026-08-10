import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, it } from "node:test";
import {
  applyGrokRefreshedTokens,
  getGrokDisplayName,
  getGrokLoginMethod,
  isGrokCredentialExpired,
  loadGrokCredentials,
  needsGrokTokenRefresh,
  persistGrokRefreshedTokens,
} from "./auth.ts";

const originalGrokHome = process.env.GROK_HOME;

afterEach(() => {
  if (originalGrokHome === undefined) {
    delete process.env.GROK_HOME;
  } else {
    process.env.GROK_HOME = originalGrokHome;
  }
});

function writeAuthFile(root: Record<string, unknown>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "grok-auth-"));
  process.env.GROK_HOME = dir;
  fs.writeFileSync(path.join(dir, "auth.json"), JSON.stringify(root), "utf-8");
  return dir;
}

describe("loadGrokCredentials", () => {
  it("prefers OIDC SuperGrok entries over legacy session scope", () => {
    writeAuthFile({
      "https://accounts.x.ai/sign-in": {
        key: "legacy-token",
        auth_mode: "session",
        email: "legacy@example.com",
      },
      "https://auth.x.ai::client-id": {
        key: "oidc-token",
        auth_mode: "oidc",
        email: "user@example.com",
        first_name: "Ada",
        last_name: "Lovelace",
        team_id: "team-1",
        user_id: "user-1",
        expires_at: "2026-08-01T00:00:00.000Z",
        refresh_token: "refresh",
        oidc_client_id: "client-id",
        oidc_issuer: "https://auth.x.ai",
      },
    });

    const creds = loadGrokCredentials();
    assert.ok(creds);
    assert.equal(creds?.accessToken, "oidc-token");
    assert.equal(creds?.email, "user@example.com");
    assert.equal(creds?.authMode, "oidc");
    assert.equal(creds?.oidcClientId, "client-id");
    assert.equal(creds?.oidcIssuer, "https://auth.x.ai");
    assert.equal(getGrokLoginMethod(creds!), "SuperGrok");
    assert.equal(getGrokDisplayName(creds!), "Ada Lovelace");
    assert.equal(isGrokCredentialExpired(creds!), false);
  });

  it("falls back to legacy session when OIDC has no key", () => {
    writeAuthFile({
      "https://auth.x.ai::client-id": {
        auth_mode: "oidc",
        email: "empty@example.com",
      },
      "https://accounts.x.ai/sign-in": {
        key: "legacy-token",
        auth_mode: "session",
        email: "legacy@example.com",
      },
    });

    const creds = loadGrokCredentials();
    assert.ok(creds);
    assert.equal(creds?.accessToken, "legacy-token");
    assert.equal(getGrokLoginMethod(creds!), "session");
  });

  it("prefers non-expired OIDC entry when multiple scopes exist", () => {
    writeAuthFile({
      "https://auth.x.ai::older-client": {
        key: "expired-token",
        auth_mode: "oidc",
        expires_at: "2020-01-01T00:00:00.000Z",
        refresh_token: "old-refresh",
      },
      "https://auth.x.ai::newer-client": {
        key: "fresh-token",
        auth_mode: "oidc",
        expires_at: "2099-01-01T00:00:00.000Z",
        refresh_token: "new-refresh",
      },
    });

    const creds = loadGrokCredentials();
    assert.ok(creds);
    assert.equal(creds?.accessToken, "fresh-token");
    assert.equal(creds?.oidcClientId, "newer-client");
  });

  it("prefers newest expires_at among non-expired OIDC entries", () => {
    writeAuthFile({
      "https://auth.x.ai::a-client": {
        key: "sooner-token",
        auth_mode: "oidc",
        expires_at: "2090-01-01T00:00:00.000Z",
      },
      "https://auth.x.ai::z-client": {
        key: "later-token",
        auth_mode: "oidc",
        expires_at: "2099-06-01T00:00:00.000Z",
      },
    });

    const creds = loadGrokCredentials();
    assert.ok(creds);
    assert.equal(creds?.accessToken, "later-token");
  });

  it("returns null when auth.json is missing", () => {
    process.env.GROK_HOME = path.join(os.tmpdir(), "grok-missing-" + Date.now());
    assert.equal(loadGrokCredentials(), null);
  });

  it("detects expired credentials and needs refresh skew", () => {
    writeAuthFile({
      "https://auth.x.ai::client-id": {
        key: "token",
        auth_mode: "oidc",
        expires_at: "2020-01-01T00:00:00.000Z",
        refresh_token: "refresh",
      },
    });
    const creds = loadGrokCredentials();
    assert.ok(creds);
    assert.equal(isGrokCredentialExpired(creds!), true);
    assert.equal(needsGrokTokenRefresh(creds!), true);
  });

  it("persists refreshed tokens into the matching scope entry", () => {
    writeAuthFile({
      "https://auth.x.ai::client-id": {
        key: "old-token",
        auth_mode: "oidc",
        expires_at: "2020-01-01T00:00:00.000Z",
        refresh_token: "old-refresh",
        email: "user@example.com",
      },
    });

    const creds = loadGrokCredentials();
    assert.ok(creds);

    const expiresAt = new Date("2099-01-01T00:00:00.000Z");
    persistGrokRefreshedTokens(creds!, {
      accessToken: "new-token",
      refreshToken: "new-refresh",
      expiresAt,
    });

    const reloaded = loadGrokCredentials();
    assert.ok(reloaded);
    assert.equal(reloaded?.accessToken, "new-token");
    assert.equal(reloaded?.refreshToken, "new-refresh");
    assert.equal(reloaded?.expiresAt?.toISOString(), expiresAt.toISOString());
    assert.equal(reloaded?.email, "user@example.com");

    const applied = applyGrokRefreshedTokens(creds!, {
      accessToken: "mem-token",
      refreshToken: "mem-refresh",
      expiresAt,
    });
    assert.equal(applied.accessToken, "mem-token");
    assert.equal(applied.refreshToken, "mem-refresh");
  });
});
