import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function makeTempFile(content: string): { dir: string; filePath: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-auth-test-"));
  const filePath = path.join(dir, "auth.json");
  fs.writeFileSync(filePath, content, "utf-8");
  return { dir, filePath };
}

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "codex-home-test-"));
}

function writeJsonFile(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
}

function makeCodexIdToken(userId: string, accountId: string): string {
  const payload = {
    email: `${userId}@example.com`,
    name: `Name for ${userId}`,
    "https://api.openai.com/auth": {
      user_id: userId,
      chatgpt_user_id: userId,
      chatgpt_account_id: accountId,
    },
  };

  return `header.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.signature`;
}

function makeCodexAuthFileName(userId: string, accountId: string): string {
  return `${Buffer.from(`${userId}::${accountId}`).toString("base64url")}.auth.json`;
}

test("normalizeCodexAuthorizationHeader adds Bearer prefix when missing", async () => {
  const { normalizeCodexAuthorizationHeader } = await import("./auth");

  assert.equal(normalizeCodexAuthorizationHeader("abc-token"), "Bearer abc-token");
  assert.equal(normalizeCodexAuthorizationHeader("Bearer already"), "Bearer already");
});

test("resolveCodexAuthTokens returns the local login token and account ID", async () => {
  const { resolveCodexAuthTokens } = await import("./auth");
  const { dir, filePath } = makeTempFile(
    JSON.stringify({ tokens: { access_token: "local-token", account_id: "account-id" } }),
  );

  try {
    const tokens = resolveCodexAuthTokens({ authFilePath: filePath });

    assert.deepEqual(tokens, {
      primaryToken: "local-token",
      primaryAccountId: "account-id",
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("resolveCodexAuthTokens returns nulls when the local auth file is missing", async () => {
  const { resolveCodexAuthTokens } = await import("./auth");

  const tokens = resolveCodexAuthTokens({
    authFilePath: path.join(os.tmpdir(), `missing-${Date.now()}.json`),
  });

  assert.deepEqual(tokens, { primaryToken: null, primaryAccountId: null });
});

test("resolveCodexHome honors CODEX_HOME when it is an existing directory", async () => {
  const { resolveCodexHome } = await import("./auth");
  const dir = makeTempDir();

  try {
    assert.equal(resolveCodexHome({ CODEX_HOME: dir } as NodeJS.ProcessEnv), dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("resolveCodexHome rejects invalid CODEX_HOME without falling back", async () => {
  const { resolveCodexHome } = await import("./auth");
  const dir = makeTempDir();
  const invalidOverride = path.join(dir, "missing");
  const homeCodexDir = path.join(dir, ".codex");
  fs.mkdirSync(homeCodexDir);

  try {
    assert.equal(
      resolveCodexHome({ CODEX_HOME: invalidOverride, HOME: dir, USERPROFILE: dir } as NodeJS.ProcessEnv),
      null,
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("resolveCodexHome falls back to HOME then USERPROFILE", async () => {
  const { resolveCodexHome } = await import("./auth");
  const homeDir = makeTempDir();
  const userProfileDir = makeTempDir();
  fs.mkdirSync(path.join(homeDir, ".codex"));
  fs.mkdirSync(path.join(userProfileDir, ".codex"));

  try {
    assert.equal(
      resolveCodexHome({ HOME: homeDir, USERPROFILE: userProfileDir } as NodeJS.ProcessEnv),
      path.join(homeDir, ".codex"),
    );
    assert.equal(
      resolveCodexHome({ USERPROFILE: userProfileDir } as NodeJS.ProcessEnv),
      path.join(userProfileDir, ".codex"),
    );
  } finally {
    fs.rmSync(homeDir, { recursive: true, force: true });
    fs.rmSync(userProfileDir, { recursive: true, force: true });
  }
});

test("listCodexOAuthAccounts reads active and stored OAuth auth files", async () => {
  const { listCodexOAuthAccounts } = await import("./auth");
  const codexHome = makeTempDir();

  try {
    writeJsonFile(path.join(codexHome, "auth.json"), {
      tokens: { access_token: "active-token", account_id: "acct_active" },
    });
    writeJsonFile(path.join(codexHome, "accounts", "work.auth.json"), {
      tokens: { access_token: "work-token", account_id: "acct_work" },
    });
    writeJsonFile(path.join(codexHome, "accounts", "api-key.auth.json"), {
      OPENAI_API_KEY: "sk-not-used",
    });
    writeJsonFile(path.join(codexHome, "accounts", "missing-account.auth.json"), {
      tokens: { access_token: "ambiguous-token" },
    });

    const accounts = listCodexOAuthAccounts({ codexHome });

    assert.deepEqual(
      accounts.map((account) => ({
        id: account.id,
        label: account.label,
        token: account.token,
        accountId: account.accountId,
        source: account.source,
      })),
      [
        {
          id: "codex-active",
          label: "Active",
          token: "active-token",
          accountId: "acct_active",
          source: "active",
        },
        {
          id: "codex-work",
          label: "work",
          token: "work-token",
          accountId: "acct_work",
          source: "stored",
        },
      ],
    );
  } finally {
    fs.rmSync(codexHome, { recursive: true, force: true });
  }
});

test("listCodexOAuthAccounts uses readable OAuth identity claims for labels", async () => {
  const { listCodexOAuthAccounts } = await import("./auth");
  const codexHome = makeTempDir();
  const accountId = "acct_labels";
  const userId = "user-label";

  try {
    writeJsonFile(path.join(codexHome, "auth.json"), {
      tokens: { access_token: "active-token", account_id: accountId, id_token: makeCodexIdToken(userId, accountId) },
    });
    writeJsonFile(path.join(codexHome, "accounts", makeCodexAuthFileName("user-other", accountId)), {
      tokens: {
        access_token: "stored-token",
        account_id: accountId,
        id_token: makeCodexIdToken("user-other", accountId),
      },
    });

    const accounts = listCodexOAuthAccounts({ codexHome });

    assert.deepEqual(
      accounts.map((account) => ({ id: account.id, label: account.label })),
      [
        { id: "codex-active", label: "user-label@example.com" },
        {
          id: `codex-${makeCodexAuthFileName("user-other", accountId).slice(0, -".auth.json".length)}`,
          label: "user-other@example.com",
        },
      ],
    );
  } finally {
    fs.rmSync(codexHome, { recursive: true, force: true });
  }
});

test("listCodexOAuthAccounts deduplicates active auth against stored accounts by Codex user identity", async () => {
  const { listCodexOAuthAccounts } = await import("./auth");
  const codexHome = makeTempDir();
  const accountId = "acct_same";
  const userId = "user-same";

  try {
    writeJsonFile(path.join(codexHome, "auth.json"), {
      tokens: { access_token: "active-token", account_id: accountId, id_token: makeCodexIdToken(userId, accountId) },
    });
    writeJsonFile(path.join(codexHome, "accounts", makeCodexAuthFileName(userId, accountId)), {
      tokens: { access_token: "stored-token", account_id: accountId, id_token: makeCodexIdToken(userId, accountId) },
    });

    const accounts = listCodexOAuthAccounts({ codexHome });

    assert.equal(accounts.length, 1);
    assert.equal(accounts[0].id, "codex-active");
    assert.equal(accounts[0].token, "active-token");
  } finally {
    fs.rmSync(codexHome, { recursive: true, force: true });
  }
});

test("listCodexOAuthAccounts keeps stored Codex users that share a ChatGPT account ID", async () => {
  const { listCodexOAuthAccounts } = await import("./auth");
  const codexHome = makeTempDir();
  const accountId = "acct_team";
  const firstUserId = "user-one";
  const secondUserId = "user-two";
  const firstFileName = makeCodexAuthFileName(firstUserId, accountId);
  const secondFileName = makeCodexAuthFileName(secondUserId, accountId);

  try {
    writeJsonFile(path.join(codexHome, "accounts", firstFileName), {
      tokens: {
        access_token: "first-token",
        account_id: accountId,
        id_token: makeCodexIdToken(firstUserId, accountId),
      },
    });
    writeJsonFile(path.join(codexHome, "accounts", secondFileName), {
      tokens: {
        access_token: "second-token",
        account_id: accountId,
        id_token: makeCodexIdToken(secondUserId, accountId),
      },
    });

    const accounts = listCodexOAuthAccounts({ codexHome });

    assert.deepEqual(
      accounts
        .map((account) => ({
          id: account.id,
          label: account.label,
          token: account.token,
          accountId: account.accountId,
          source: account.source,
        }))
        .sort((a, b) => a.token.localeCompare(b.token)),
      [
        {
          id: `codex-${firstFileName.slice(0, -".auth.json".length)}`,
          label: `${firstUserId}@example.com`,
          token: "first-token",
          accountId,
          source: "stored",
        },
        {
          id: `codex-${secondFileName.slice(0, -".auth.json".length)}`,
          label: `${secondUserId}@example.com`,
          token: "second-token",
          accountId,
          source: "stored",
        },
      ],
    );
  } finally {
    fs.rmSync(codexHome, { recursive: true, force: true });
  }
});
