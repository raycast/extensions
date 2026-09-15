import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("resolveClaudeCredentialsPaths prefers CLAUDE_CONFIG_DIR and keeps the default fallback", async () => {
  const { resolveClaudeCredentialsPaths } = await import("./fetcher.ts");

  assert.deepEqual(resolveClaudeCredentialsPaths({ CLAUDE_CONFIG_DIR: "/tmp/custom-claude" }), [
    path.resolve("/tmp/custom-claude", ".credentials.json"),
    path.join(os.homedir(), ".claude", ".credentials.json"),
  ]);
});

test("resolveClaudeCredentialsPaths uses the default Claude config dir when CLAUDE_CONFIG_DIR is blank", async () => {
  const { resolveClaudeCredentialsPaths } = await import("./fetcher.ts");

  assert.deepEqual(resolveClaudeCredentialsPaths({ CLAUDE_CONFIG_DIR: "   " }), [
    path.join(os.homedir(), ".claude", ".credentials.json"),
  ]);
});

test("resolveClaudeCredentialsPaths de-duplicates CLAUDE_CONFIG_DIR when it matches the default dir", async () => {
  const { resolveClaudeCredentialsPaths } = await import("./fetcher.ts");

  assert.deepEqual(resolveClaudeCredentialsPaths({ CLAUDE_CONFIG_DIR: path.join(os.homedir(), ".claude/") }), [
    path.join(os.homedir(), ".claude", ".credentials.json"),
  ]);
});

function makeClaudeHome(dirName: string, oauth: Record<string, unknown> | null): { parent: string; configDir: string } {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "claude-home-test-"));
  const configDir = path.join(parent, dirName);
  fs.mkdirSync(configDir, { recursive: true });
  if (oauth !== null) {
    fs.writeFileSync(
      path.join(configDir, ".credentials.json"),
      `${JSON.stringify({ claudeAiOauth: oauth }, null, 2)}\n`,
      "utf-8",
    );
  }
  return { parent, configDir };
}

const VALID_OAUTH = {
  accessToken: "access-token-1",
  refreshToken: "refresh-token-1",
  expiresAt: 4102444800000,
  scopes: ["user:inference", "user:profile"],
  subscriptionType: "max",
  rateLimitTier: "default_claude_max_5x",
};

test("listClaudeOAuthAccounts reads an explicit config dir and labels it from the directory name", async () => {
  const { listClaudeOAuthAccounts } = await import("./fetcher.ts");
  const { parent, configDir } = makeClaudeHome(".claude-lazy", VALID_OAUTH);

  try {
    const accounts = listClaudeOAuthAccounts({ configDir });

    assert.equal(accounts.length, 1);
    assert.equal(accounts[0].label, "lazy");
    assert.equal(accounts[0].token, "access-token-1");
    assert.equal(accounts[0].scopeError, null);
    assert.equal(accounts[0].credentials.subscriptionType, "max");
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

test("listClaudeOAuthAccounts labels the stock .claude directory as Default", async () => {
  const { listClaudeOAuthAccounts } = await import("./fetcher.ts");
  const { parent, configDir } = makeClaudeHome(".claude", VALID_OAUTH);

  try {
    assert.equal(listClaudeOAuthAccounts({ configDir })[0].label, "Default");
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

test("listClaudeOAuthAccounts returns no accounts when the credentials file is missing", async () => {
  const { listClaudeOAuthAccounts } = await import("./fetcher.ts");
  const { parent, configDir } = makeClaudeHome(".claude-empty", null);

  try {
    assert.deepEqual(listClaudeOAuthAccounts({ configDir }), []);
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

test("listClaudeOAuthAccounts skips a credentials file that is not parseable", async () => {
  const { listClaudeOAuthAccounts } = await import("./fetcher.ts");
  const { parent, configDir } = makeClaudeHome(".claude-broken", null);
  fs.writeFileSync(path.join(configDir, ".credentials.json"), "{ not json", "utf-8");

  try {
    assert.deepEqual(listClaudeOAuthAccounts({ configDir }), []);
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

test("listClaudeOAuthAccounts keeps an account missing the user:profile scope and reports the error", async () => {
  const { listClaudeOAuthAccounts } = await import("./fetcher.ts");
  const { parent, configDir } = makeClaudeHome(".claude-flex", {
    ...VALID_OAUTH,
    scopes: ["user:inference"],
  });

  try {
    const accounts = listClaudeOAuthAccounts({ configDir });

    assert.equal(accounts.length, 1);
    assert.equal(accounts[0].label, "flex");
    assert.equal(accounts[0].scopeError?.type, "missing_scope");
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

test("dedupeClaudeAccounts drops later accounts that repeat an access token", async () => {
  const { dedupeClaudeAccounts } = await import("./fetcher.ts");

  const accounts = [
    { id: "a", label: "lazy", token: "shared", credentials: {}, scopeError: null },
    { id: "b", label: "mirror", token: "shared", credentials: {}, scopeError: null },
    { id: "c", label: "flex", token: "other", credentials: {}, scopeError: null },
  ] as unknown as Parameters<typeof dedupeClaudeAccounts>[0];

  assert.deepEqual(
    dedupeClaudeAccounts(accounts).map((account) => account.label),
    ["lazy", "flex"],
  );
});
