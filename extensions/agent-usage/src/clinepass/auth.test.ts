import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildClinePassAccountCandidates } from "./accounts.ts";
import { formatClineApiToken, readClineCredential, refreshClineCredential } from "./auth.ts";

function makeTempClineHome(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "clinepass-auth-"));
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

test("readClineCredential prefers the current shared Cline provider auth", () => {
  const clineHome = makeTempClineHome();
  try {
    writeJson(path.join(clineHome, "data", "settings", "providers.json"), {
      version: 1,
      providers: {
        "cline-pass": { settings: { auth: { accessToken: "ignored-pass-token", accountId: "usr-ignored" } } },
        cline: {
          updatedAt: 123,
          settings: {
            auth: {
              accessToken: "workos:current-token",
              refreshToken: "current-refresh",
              expiresAt: 2_000_000_000_000,
              accountId: "usr-current",
              metadata: { userInfo: { email: "current@example.com", name: "Current User" } },
            },
          },
        },
      },
    });
    writeJson(path.join(clineHome, "data", "secrets.json"), {
      "cline:clineAccountId": JSON.stringify({
        idToken: "legacy-token",
        refreshToken: "legacy-refresh",
        expiresAt: 2_000_000_000,
        userInfo: { id: "usr-legacy", email: "legacy@example.com" },
      }),
    });

    assert.deepEqual(readClineCredential({ clineHome }), {
      id: "clinepass-auto",
      label: "Current User",
      token: "workos:current-token",
      userId: "usr-current",
      refreshToken: "current-refresh",
      expiresAt: 2_000_000_000_000,
      source: "providers",
      sourcePath: path.join(clineHome, "data", "settings", "providers.json"),
    });
  } finally {
    fs.rmSync(clineHome, { recursive: true, force: true });
  }
});

test("readClineCredential falls back to the JSON-encoded legacy secret", () => {
  const clineHome = makeTempClineHome();
  try {
    writeJson(path.join(clineHome, "data", "secrets.json"), {
      unrelated: "preserved",
      "cline:clineAccountId": JSON.stringify({
        idToken: "legacy-token",
        refreshToken: "legacy-refresh",
        expiresAt: 2_000_000_000,
        userInfo: { id: "usr-legacy", displayName: "Legacy User", email: "legacy@example.com" },
      }),
    });

    assert.deepEqual(readClineCredential({ clineHome }), {
      id: "clinepass-auto",
      label: "Legacy User",
      token: "legacy-token",
      userId: "usr-legacy",
      refreshToken: "legacy-refresh",
      expiresAt: 2_000_000_000_000,
      source: "legacy",
      sourcePath: path.join(clineHome, "data", "secrets.json"),
    });
  } finally {
    fs.rmSync(clineHome, { recursive: true, force: true });
  }
});

test("formatClineApiToken keeps API keys raw and prefixes Cline session tokens", () => {
  assert.equal(formatClineApiToken("sk_manual"), "sk_manual");
  assert.equal(formatClineApiToken("workos:session"), "workos:session");
  assert.equal(formatClineApiToken("session"), "workos:session");
});

test("buildClinePassAccountCandidates validates manual credentials and deduplicates the auto account", () => {
  const auto = {
    id: "clinepass-auto",
    label: "auto@example.com",
    token: "workos:auto",
    userId: "usr-auto",
    refreshToken: "refresh",
    expiresAt: 2_000_000_000_000,
    source: "providers" as const,
    sourcePath: "providers.json",
  };
  const accounts = buildClinePassAccountCandidates(auto, [
    { id: "duplicate", label: "Duplicate", token: "workos:auto", accountId: "usr-auto" },
    { id: "valid", label: "Manual", token: "sk_manual", accountId: "usr-manual" },
    { id: "bad-key", label: "Bad Key", token: "token", accountId: "usr-bad" },
    { id: "bad-user", label: "Bad User", token: "sk_other", accountId: "account" },
  ]);

  assert.equal(accounts.length, 4);
  assert.equal(accounts[0].source, "providers");
  assert.equal(accounts[1].validationError, null);
  assert.match(accounts[2].validationError ?? "", /sk_/);
  assert.match(accounts[3].validationError ?? "", /usr-/);
});

test("refreshClineCredential atomically updates shared provider auth without clobbering other settings", async () => {
  const clineHome = makeTempClineHome();
  const providersPath = path.join(clineHome, "data", "settings", "providers.json");
  try {
    writeJson(providersPath, {
      version: 7,
      lastUsedProvider: "cline-pass",
      providers: {
        other: { settings: { keep: true } },
        cline: {
          custom: "preserved",
          settings: {
            model: "preserved-model",
            auth: {
              accessToken: "workos:old-token",
              refreshToken: "old-refresh",
              expiresAt: 1,
              accountId: "usr-current",
              metadata: { keep: true, userInfo: { email: "old@example.com" } },
            },
          },
        },
      },
    });
    const original = readClineCredential({ clineHome });
    assert.ok(original);

    const result = await refreshClineCredential(original, {
      requestRefresh: async (refreshToken) => {
        assert.equal(refreshToken, "old-refresh");
        return {
          accessToken: "new-token",
          refreshToken: "new-refresh",
          expiresAt: "2030-01-02T03:04:05.000Z",
          userInfo: { clineUserId: "usr-current", email: "new@example.com", name: "New User" },
        };
      },
    });

    assert.equal(result.error, null);
    assert.equal(result.credential?.token, "workos:new-token");
    assert.equal(result.credential?.refreshToken, "new-refresh");
    const saved = JSON.parse(fs.readFileSync(providersPath, "utf8"));
    assert.equal(saved.version, 7);
    assert.deepEqual(saved.providers.other, { settings: { keep: true } });
    assert.equal(saved.providers.cline.custom, "preserved");
    assert.equal(saved.providers.cline.settings.model, "preserved-model");
    assert.equal(saved.providers.cline.settings.auth.accessToken, "workos:new-token");
    assert.equal(saved.providers.cline.settings.auth.metadata.keep, true);
    assert.equal(saved.providers.cline.settings.auth.metadata.userInfo.email, "new@example.com");
  } finally {
    fs.rmSync(clineHome, { recursive: true, force: true });
  }
});

test("refreshClineCredential does not overwrite a credential Cline changed concurrently", async () => {
  const clineHome = makeTempClineHome();
  const providersPath = path.join(clineHome, "data", "settings", "providers.json");
  try {
    const writeCredential = (token: string, refreshToken: string) =>
      writeJson(providersPath, {
        providers: {
          cline: { settings: { auth: { accessToken: token, refreshToken, accountId: "usr-current" } } },
        },
      });
    writeCredential("workos:old-token", "old-refresh");
    const original = readClineCredential({ clineHome });
    assert.ok(original);

    const result = await refreshClineCredential(original, {
      requestRefresh: async () => {
        return {
          accessToken: "our-token",
          refreshToken: "our-refresh",
          expiresAt: "2030-01-02T03:04:05.000Z",
          userInfo: { clineUserId: "usr-current" },
        };
      },
      beforePersistCommit: (_filePath, attempt) => {
        if (attempt === 0) writeCredential("workos:cline-won", "cline-refresh");
      },
    });

    assert.equal(result.error, null);
    assert.equal(result.credential?.token, "workos:cline-won");
    assert.equal(readClineCredential({ clineHome })?.token, "workos:cline-won");
  } finally {
    fs.rmSync(clineHome, { recursive: true, force: true });
  }
});

test("refreshClineCredential retries a provider write when Cline changes unrelated settings before commit", async () => {
  const clineHome = makeTempClineHome();
  const providersPath = path.join(clineHome, "data", "settings", "providers.json");
  try {
    writeJson(providersPath, {
      revision: 1,
      providers: {
        cline: {
          settings: {
            auth: {
              accessToken: "workos:old-token",
              refreshToken: "old-refresh",
              accountId: "usr-current",
            },
          },
        },
      },
    });
    const original = readClineCredential({ clineHome });
    assert.ok(original);

    const result = await refreshClineCredential(original, {
      requestRefresh: async () => ({
        accessToken: "new-token",
        refreshToken: "new-refresh",
        expiresAt: "2030-01-02T03:04:05.000Z",
        userInfo: { clineUserId: "usr-current" },
      }),
      beforePersistCommit: (_filePath, attempt) => {
        if (attempt !== 0) return;
        writeJson(providersPath, {
          revision: 2,
          providers: {
            other: { settings: { concurrentlyAdded: true } },
            cline: {
              settings: {
                auth: {
                  accessToken: "workos:old-token",
                  refreshToken: "old-refresh",
                  accountId: "usr-current",
                },
              },
            },
          },
        });
      },
    });

    assert.equal(result.error, null);
    assert.equal(result.credential?.token, "workos:new-token");
    const saved = JSON.parse(fs.readFileSync(providersPath, "utf8"));
    assert.equal(saved.revision, 2);
    assert.deepEqual(saved.providers.other, { settings: { concurrentlyAdded: true } });
  } finally {
    fs.rmSync(clineHome, { recursive: true, force: true });
  }
});

test("refreshClineCredential updates the legacy encoded secret and preserves unrelated values", async () => {
  const clineHome = makeTempClineHome();
  const secretsPath = path.join(clineHome, "data", "secrets.json");
  try {
    writeJson(secretsPath, {
      unrelated: { keep: true },
      "cline:clineAccountId": JSON.stringify({
        idToken: "old-token",
        refreshToken: "old-refresh",
        expiresAt: 1,
        provider: "workos",
        userInfo: { id: "usr-legacy", email: "old@example.com", keep: true },
      }),
    });
    const original = readClineCredential({ clineHome });
    assert.ok(original);

    const result = await refreshClineCredential(original, {
      requestRefresh: async () => ({
        accessToken: "workos:new-token",
        refreshToken: "new-refresh",
        expiresAt: "2030-01-02T03:04:05.000Z",
        userInfo: { clineUserId: "usr-legacy", email: "new@example.com", name: "New User" },
      }),
    });

    assert.equal(result.error, null);
    assert.equal(result.credential?.token, "new-token");
    const saved = JSON.parse(fs.readFileSync(secretsPath, "utf8"));
    const savedAuth = JSON.parse(saved["cline:clineAccountId"]);
    assert.deepEqual(saved.unrelated, { keep: true });
    assert.equal(savedAuth.provider, "workos");
    assert.equal(savedAuth.idToken, "new-token");
    assert.equal(savedAuth.refreshToken, "new-refresh");
    assert.equal(savedAuth.userInfo.keep, true);
    assert.equal(savedAuth.userInfo.email, "new@example.com");
    assert.equal(savedAuth.userInfo.displayName, "New User");
  } finally {
    fs.rmSync(clineHome, { recursive: true, force: true });
  }
});

test("refreshClineCredential retries a legacy write when Cline changes another secret before commit", async () => {
  const clineHome = makeTempClineHome();
  const secretsPath = path.join(clineHome, "data", "secrets.json");
  try {
    const encodedAuth = JSON.stringify({
      idToken: "old-token",
      refreshToken: "old-refresh",
      expiresAt: 1,
      userInfo: { id: "usr-legacy" },
    });
    writeJson(secretsPath, { revision: 1, "cline:clineAccountId": encodedAuth });
    const original = readClineCredential({ clineHome });
    assert.ok(original);

    const result = await refreshClineCredential(original, {
      requestRefresh: async () => ({
        accessToken: "workos:new-token",
        refreshToken: "new-refresh",
        expiresAt: "2030-01-02T03:04:05.000Z",
        userInfo: { clineUserId: "usr-legacy" },
      }),
      beforePersistCommit: (_filePath, attempt) => {
        if (attempt !== 0) return;
        writeJson(secretsPath, {
          revision: 2,
          unrelated: { concurrentlyAdded: true },
          "cline:clineAccountId": encodedAuth,
        });
      },
    });

    assert.equal(result.error, null);
    assert.equal(result.credential?.token, "new-token");
    const saved = JSON.parse(fs.readFileSync(secretsPath, "utf8"));
    assert.equal(saved.revision, 2);
    assert.deepEqual(saved.unrelated, { concurrentlyAdded: true });
  } finally {
    fs.rmSync(clineHome, { recursive: true, force: true });
  }
});
