import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function makeFakeShell(scriptBody: string): { dir: string; shellPath: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "zai-auth-test-"));
  const shellPath = path.join(dir, "fake-shell.sh");
  fs.writeFileSync(shellPath, `#!/bin/sh\n${scriptBody}\n`, "utf-8");
  fs.chmodSync(shellPath, 0o755);
  return { dir, shellPath };
}

async function withEnv<T>(updates: Record<string, string | undefined>, run: () => Promise<T>): Promise<T> {
  const previous: Record<string, string | undefined> = {};

  for (const [key, value] of Object.entries(updates)) {
    previous[key] = process.env[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return await run();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

function withTestAuthFile<T>(run: () => Promise<T>): Promise<T> {
  // Use a non-existent path to ensure opencode auth file is not found
  return withEnv({ TEST_OPENCODE_AUTH_PATH: "/nonexistent/opencode/auth.json" }, run);
}

test("resolveZaiAuthTokens reads token from noisy login shell output", async () => {
  const { resolveZaiAuthTokens } = await import("./auth");

  const { dir, shellPath } = makeFakeShell(`
echo "loading shell plugins..."
printf "__ZAI_API_KEY_START__shell-zai-token__ZAI_API_KEY_END__\\n"
printf "__GLM_API_KEY_START__shell-glm-token__GLM_API_KEY_END__\\n"
`);

  try {
    await withTestAuthFile(async () => {
      await withEnv(
        {
          ZAI_API_KEY: undefined,
          GLM_API_KEY: undefined,
          SHELL: shellPath,
        },
        async () => {
          const tokens = await resolveZaiAuthTokens({});
          assert.equal(tokens.primaryToken, "shell-zai-token");
          assert.equal(tokens.localToken, "shell-zai-token");
          assert.equal(tokens.preferenceToken, null);
          assert.deepEqual(tokens.allTokens, ["shell-zai-token"]);
        },
      );
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("resolveZaiAuthTokens prefers direct process env token", async () => {
  const { resolveZaiAuthTokens } = await import("./auth");

  const { dir, shellPath } = makeFakeShell(`printf "__ZAI_API_KEY_START__shell-token__ZAI_API_KEY_END__\\n"`);

  try {
    await withTestAuthFile(async () => {
      await withEnv(
        {
          ZAI_API_KEY: "direct-zai-token",
          GLM_API_KEY: undefined,
          SHELL: shellPath,
        },
        async () => {
          const tokens = await resolveZaiAuthTokens({});
          assert.equal(tokens.primaryToken, "direct-zai-token");
          assert.equal(tokens.localToken, "direct-zai-token");
          assert.equal(tokens.preferenceToken, null);
          assert.deepEqual(tokens.allTokens, ["direct-zai-token"]);
        },
      );
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("resolveZaiAuthTokens uses preference token when provided", async () => {
  const { resolveZaiAuthTokens } = await import("./auth");

  const { dir, shellPath } = makeFakeShell("exit 0");

  try {
    await withEnv(
      {
        ZAI_API_KEY: undefined,
        GLM_API_KEY: undefined,
        SHELL: shellPath,
      },
      async () => {
        const tokens = await resolveZaiAuthTokens({ preferenceToken: "pref-token" });
        assert.equal(tokens.primaryToken, "pref-token");
        assert.equal(tokens.localToken, null);
        assert.equal(tokens.preferenceToken, "pref-token");
        assert.deepEqual(tokens.allTokens, ["pref-token"]);
      },
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("resolveZaiAuthTokens includes second preference token", async () => {
  const { resolveZaiAuthTokens } = await import("./auth");

  const { dir, shellPath } = makeFakeShell("exit 0");

  try {
    await withEnv(
      {
        ZAI_API_KEY: undefined,
        GLM_API_KEY: undefined,
        SHELL: shellPath,
      },
      async () => {
        const tokens = await resolveZaiAuthTokens({
          preferenceToken: "pref-token-1",
          preferenceToken2: "pref-token-2",
        });
        assert.equal(tokens.primaryToken, "pref-token-1");
        assert.equal(tokens.localToken, null);
        assert.equal(tokens.preferenceToken, "pref-token-1");
        assert.deepEqual(tokens.allTokens, ["pref-token-1", "pref-token-2"]);
      },
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("resolveZaiAuthTokens includes second preference token with auto-detected primary", async () => {
  const { resolveZaiAuthTokens } = await import("./auth");

  const { dir, shellPath } = makeFakeShell(`
printf "__ZAI_API_KEY_START__shell-zai-token__ZAI_API_KEY_END__\\n"
`);

  try {
    await withTestAuthFile(async () => {
      await withEnv(
        {
          ZAI_API_KEY: undefined,
          GLM_API_KEY: undefined,
          SHELL: shellPath,
        },
        async () => {
          const tokens = await resolveZaiAuthTokens({
            preferenceToken2: "pref-token-2",
          });
          assert.equal(tokens.primaryToken, "shell-zai-token");
          assert.equal(tokens.localToken, "shell-zai-token");
          assert.equal(tokens.preferenceToken, null);
          assert.deepEqual(tokens.allTokens, ["shell-zai-token", "pref-token-2"]);
        },
      );
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("resolveZaiAuthTokens returns empty when no tokens found", async () => {
  const { resolveZaiAuthTokens } = await import("./auth");

  const { dir, shellPath } = makeFakeShell("exit 0");

  try {
    await withTestAuthFile(async () => {
      await withEnv(
        {
          ZAI_API_KEY: undefined,
          GLM_API_KEY: undefined,
          SHELL: shellPath,
        },
        async () => {
          const tokens = await resolveZaiAuthTokens({});
          assert.equal(tokens.primaryToken, null);
          assert.equal(tokens.localToken, null);
          assert.equal(tokens.preferenceToken, null);
          assert.deepEqual(tokens.allTokens, []);
        },
      );
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
