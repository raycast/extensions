import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildClinePassAccountCandidates } from "./accounts.ts";
import { formatClineApiToken, readClineCredential, readClineCredentials, refreshClineCredential } from "./auth.ts";

function makeTempClineHome(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "clinepass-auth-"));
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeBothCredentialFiles(clineHome: string): { providersPath: string; secretsPath: string } {
  const providersPath = path.join(clineHome, "data", "settings", "providers.json");
  const secretsPath = path.join(clineHome, "data", "secrets.json");
  writeJson(providersPath, {
    version: 7,
    unrelated: { preserved: true },
    providers: {
      cline: {
        settings: {
          auth: {
            accessToken: "workos:providers-token",
            refreshToken: "providers-refresh",
            expiresAt: 2_000_000_000_000,
            accountId: "usr-providers",
            metadata: { userInfo: { name: "Providers User" } },
          },
        },
      },
    },
  });
  writeJson(secretsPath, {
    unrelated: "preserved",
    "cline:clineAccountId": JSON.stringify({
      idToken: "legacy-token",
      refreshToken: "legacy-refresh",
      expiresAt: 2_000_000_000,
      userInfo: { id: "usr-legacy", displayName: "Legacy User" },
    }),
  });
  return { providersPath, secretsPath };
}

test("readClineCredentials reads providers.json and secrets.json in priority order", () => {
  const clineHome = makeTempClineHome();
  try {
    const { providersPath, secretsPath } = writeBothCredentialFiles(clineHome);
    const credentials = readClineCredentials({ clineHome });

    assert.equal(credentials.length, 2);
    assert.deepEqual(credentials[0], {
      id: "clinepass-auto",
      label: "Providers User",
      token: "workos:providers-token",
      userId: "usr-providers",
      refreshToken: "providers-refresh",
      expiresAt: 2_000_000_000_000,
      source: "providers",
      sourcePath: providersPath,
      clineHome,
    });
    assert.deepEqual(credentials[1], {
      id: "clinepass-auto",
      label: "Legacy User",
      token: "legacy-token",
      userId: "usr-legacy",
      refreshToken: "legacy-refresh",
      expiresAt: 2_000_000_000_000,
      source: "legacy",
      sourcePath: secretsPath,
      clineHome,
    });
    assert.deepEqual(readClineCredential({ clineHome }), credentials[0]);
  } finally {
    fs.rmSync(clineHome, { recursive: true, force: true });
  }
});

test("readClineCredentials deduplicates identical credentials found in both files", () => {
  const clineHome = makeTempClineHome();
  try {
    const providersPath = path.join(clineHome, "data", "settings", "providers.json");
    const secretsPath = path.join(clineHome, "data", "secrets.json");
    writeJson(providersPath, {
      providers: {
        cline: {
          settings: { auth: { accessToken: "same-token", refreshToken: "provider-refresh", accountId: "usr-same" } },
        },
      },
    });
    writeJson(secretsPath, {
      "cline:clineAccountId": JSON.stringify({
        idToken: "same-token",
        refreshToken: "legacy-refresh",
        userInfo: { id: "usr-same" },
      }),
    });

    const credentials = readClineCredentials({ clineHome });
    assert.equal(credentials.length, 1);
    assert.equal(credentials[0].source, "providers");
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
    clineHome: ".cline",
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

test("refreshClineCredential returns a local credential without mutating either Cline-owned file", async () => {
  const clineHome = makeTempClineHome();
  try {
    const { providersPath, secretsPath } = writeBothCredentialFiles(clineHome);
    const providersBefore = fs.readFileSync(providersPath, "utf8");
    const secretsBefore = fs.readFileSync(secretsPath, "utf8");
    const original = readClineCredential({ clineHome });
    assert.ok(original);

    const result = await refreshClineCredential(original, {
      requestRefresh: async (refreshToken) => {
        assert.equal(refreshToken, "providers-refresh");
        return {
          accessToken: "new-token",
          refreshToken: "new-refresh",
          expiresAt: "2030-01-02T03:04:05.000Z",
          userInfo: { clineUserId: "usr-providers", name: "Refreshed User" },
        };
      },
    });

    assert.equal(result.error, null);
    assert.deepEqual(result.credential, {
      id: "clinepass-auto",
      label: "Refreshed User",
      token: "workos:new-token",
      userId: "usr-providers",
      refreshToken: "new-refresh",
      expiresAt: Date.parse("2030-01-02T03:04:05.000Z"),
      source: "local",
      clineHome,
    });
    assert.equal(fs.readFileSync(providersPath, "utf8"), providersBefore);
    assert.equal(fs.readFileSync(secretsPath, "utf8"), secretsBefore);
  } finally {
    fs.rmSync(clineHome, { recursive: true, force: true });
  }
});

test("manual Cline API keys are never sent to the session refresh endpoint", async () => {
  let refreshCalled = false;
  const result = await refreshClineCredential(
    {
      id: "manual",
      label: "Manual",
      token: "sk_manual",
      userId: "usr-manual",
      refreshToken: "must-not-be-used",
      source: "manual",
    },
    {
      requestRefresh: async () => {
        refreshCalled = true;
        throw new Error("unexpected");
      },
    },
  );

  assert.equal(refreshCalled, false);
  assert.equal(result.credential, null);
  assert.equal(result.error?.type, "unauthorized");
});
