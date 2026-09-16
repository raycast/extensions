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

function writeClaudeConfig(configDir: string, oauthAccount: Record<string, unknown> | null): void {
  fs.writeFileSync(
    path.join(configDir, ".claude.json"),
    JSON.stringify(oauthAccount === null ? { projects: {} } : { projects: {}, oauthAccount }),
    "utf-8",
  );
}

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
  const { parent, configDir } = makeClaudeHome(".claude-personal", VALID_OAUTH);

  try {
    const accounts = listClaudeOAuthAccounts({ configDir });

    assert.equal(accounts.length, 1);
    assert.equal(accounts[0].label, "personal");
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
  const { parent, configDir } = makeClaudeHome(".claude-work", {
    ...VALID_OAUTH,
    scopes: ["user:inference"],
  });

  try {
    const accounts = listClaudeOAuthAccounts({ configDir });

    assert.equal(accounts.length, 1);
    assert.equal(accounts[0].label, "work");
    assert.equal(accounts[0].scopeError?.type, "missing_scope");
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

test("dedupeClaudeAccounts drops later accounts that repeat an access token", async () => {
  const { dedupeClaudeAccounts } = await import("./fetcher.ts");

  const accounts = [
    { id: "a", label: "personal", token: "shared", credentials: {}, scopeError: null },
    { id: "b", label: "mirror", token: "shared", credentials: {}, scopeError: null },
    { id: "c", label: "work", token: "other", credentials: {}, scopeError: null },
  ] as unknown as Parameters<typeof dedupeClaudeAccounts>[0];

  assert.deepEqual(
    dedupeClaudeAccounts(accounts).map((account) => account.label),
    ["personal", "work"],
  );
});

test("claudeKeychainService uses the bare service name for the default Claude home", async () => {
  const { claudeKeychainService } = await import("./fetcher.ts");

  assert.equal(claudeKeychainService("/Users/someone/.claude", "/Users/someone"), "Claude Code-credentials");
  assert.equal(claudeKeychainService("~/.claude", "/Users/someone"), "Claude Code-credentials");
});

test("claudeKeychainService derives the per-profile suffix from the config dir path", async () => {
  const { claudeKeychainService } = await import("./fetcher.ts");

  // The suffix is sha256(<absolute config dir>) truncated to 8 hex characters —
  // the shape Claude Code was observed to create on a real macOS install.
  assert.equal(
    claudeKeychainService("/Users/someone/.claude-work", "/Users/someone"),
    "Claude Code-credentials-18cc900a",
  );
  assert.equal(
    claudeKeychainService("/Users/someone/.claude-personal", "/Users/someone"),
    "Claude Code-credentials-c160e579",
  );
});

test("listClaudeOAuthAccounts prefers the Keychain credential over a stale credentials file", async () => {
  const { listClaudeOAuthAccounts } = await import("./fetcher.ts");
  const { parent, configDir } = makeClaudeHome(".claude-work", { ...VALID_OAUTH, accessToken: "stale-file-token" });

  try {
    const accounts = listClaudeOAuthAccounts({
      configDir,
      readKeychain: () => ({
        password: JSON.stringify({ claudeAiOauth: { ...VALID_OAUTH, accessToken: "fresh-keychain-token" } }),
        account: "someone",
      }),
    });

    assert.equal(accounts.length, 1);
    assert.equal(accounts[0].token, "fresh-keychain-token");
    assert.equal(accounts[0].credentials.source, "keychain");
    assert.equal(accounts[0].label, "work");
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

test("listClaudeOAuthAccounts falls back to the credentials file when the Keychain has nothing", async () => {
  const { listClaudeOAuthAccounts } = await import("./fetcher.ts");
  const { parent, configDir } = makeClaudeHome(".claude-work", { ...VALID_OAUTH, accessToken: "file-token" });

  try {
    const accounts = listClaudeOAuthAccounts({
      configDir,
      readKeychain: () => ({ password: null, account: null }),
    });

    assert.equal(accounts.length, 1);
    assert.equal(accounts[0].token, "file-token");
    assert.equal(accounts[0].credentials.source, "file");
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

test("a Keychain-sourced account records the service it came from so a refresh writes back to it", async () => {
  const { listClaudeOAuthAccounts, claudeKeychainService } = await import("./fetcher.ts");
  const { parent, configDir } = makeClaudeHome(".claude-work", null);

  try {
    const accounts = listClaudeOAuthAccounts({
      configDir,
      readKeychain: () => ({ password: JSON.stringify({ claudeAiOauth: VALID_OAUTH }), account: "someone" }),
    });

    assert.equal(accounts[0].credentials.keychainService, claudeKeychainService(configDir));
    assert.equal(accounts[0].credentials.keychainAccount, "someone");
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

test("dedupeClaudeAccounts collapses config dirs that resolve to the same directory", async () => {
  const { dedupeClaudeAccounts } = await import("./fetcher.ts");

  // `~/.claude` symlinked to `~/.claude-profile` is one account reached two
  // ways. Each path has its own Keychain item, so the tokens differ and token
  // de-duplication alone cannot catch it.
  const accounts = [
    { id: "a", label: "Default", token: "token-from-bare-service", configDir: "/home/u/.claude-profile" },
    { id: "b", label: "profile", token: "token-from-suffixed-service", configDir: "/home/u/.claude-profile" },
    { id: "c", label: "work", token: "work-token", configDir: "/home/u/.claude-work" },
  ] as unknown as Parameters<typeof dedupeClaudeAccounts>[0];

  assert.deepEqual(
    dedupeClaudeAccounts(accounts).map((account) => account.label),
    ["Default", "work"],
  );
});

test("readClaudeAccountIdentity pulls the signed-in account out of .claude.json", async () => {
  const { readClaudeAccountIdentity } = await import("./fetcher.ts");
  const { parent, configDir } = makeClaudeHome(".claude", VALID_OAUTH);
  writeClaudeConfig(configDir, {
    emailAddress: "someone@example.com",
    displayName: "someone",
    organizationName: "Example Org",
  });

  try {
    assert.deepEqual(readClaudeAccountIdentity(configDir), {
      email: "someone@example.com",
      displayName: "someone",
      organizationName: "Example Org",
    });
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

test("readClaudeAccountIdentity returns null when the config has no signed-in account", async () => {
  const { readClaudeAccountIdentity } = await import("./fetcher.ts");
  const { parent, configDir } = makeClaudeHome(".claude", VALID_OAUTH);
  writeClaudeConfig(configDir, null);

  try {
    assert.equal(readClaudeAccountIdentity(configDir), null);
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

test("the stock .claude home is labelled by its account instead of the generic Default", async () => {
  const { listClaudeOAuthAccounts } = await import("./fetcher.ts");
  const { parent, configDir } = makeClaudeHome(".claude", VALID_OAUTH);
  writeClaudeConfig(configDir, { emailAddress: "someone@example.com", displayName: "someone" });

  try {
    const [account] = listClaudeOAuthAccounts({ configDir, readKeychain: () => ({ password: null, account: null }) });

    assert.equal(account.label, "someone");
    assert.equal(account.identity?.email, "someone@example.com");
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

test("the stock home falls back to the email local part when the account has no display name", async () => {
  const { listClaudeOAuthAccounts } = await import("./fetcher.ts");
  const { parent, configDir } = makeClaudeHome(".claude", VALID_OAUTH);
  writeClaudeConfig(configDir, { emailAddress: "no.display.name@example.com" });

  try {
    const [account] = listClaudeOAuthAccounts({ configDir, readKeychain: () => ({ password: null, account: null }) });

    assert.equal(account.label, "no.display.name");
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

test("a named config dir keeps its directory label even when an account identity is available", async () => {
  const { listClaudeOAuthAccounts } = await import("./fetcher.ts");
  const { parent, configDir } = makeClaudeHome(".claude-work", VALID_OAUTH);
  writeClaudeConfig(configDir, { emailAddress: "work@example.com", displayName: "Someone Else" });

  try {
    const [account] = listClaudeOAuthAccounts({ configDir, readKeychain: () => ({ password: null, account: null }) });

    assert.equal(account.label, "work");
    assert.equal(account.identity?.email, "work@example.com");
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});
