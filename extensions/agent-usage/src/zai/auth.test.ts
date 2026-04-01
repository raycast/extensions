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

test("resolveZaiAuthTokens reads token from noisy login shell output", async () => {
  const { resolveZaiAuthTokens } = await import("./auth");

  const { dir, shellPath } = makeFakeShell(`
echo "loading shell plugins..."
printf "__ZAI_API_KEY_START__shell-zai-token__ZAI_API_KEY_END__\\n"
printf "__GLM_API_KEY_START__shell-glm-token__GLM_API_KEY_END__\\n"
`);

  try {
    await withEnv(
      {
        ZAI_API_KEY: undefined,
        GLM_API_KEY: undefined,
        SHELL: shellPath,
      },
      async () => {
        const tokens = await resolveZaiAuthTokens({ preferenceToken: "pref-token" });
        assert.deepEqual(tokens, {
          primaryToken: "shell-zai-token",
          localToken: "shell-zai-token",
          preferenceToken: "pref-token",
        });
      },
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("resolveZaiAuthTokens prefers direct process env token", async () => {
  const { resolveZaiAuthTokens } = await import("./auth");

  const { dir, shellPath } = makeFakeShell(`printf "__ZAI_API_KEY_START__shell-token__ZAI_API_KEY_END__\\n"`);

  try {
    await withEnv(
      {
        ZAI_API_KEY: "direct-zai-token",
        GLM_API_KEY: undefined,
        SHELL: shellPath,
      },
      async () => {
        const tokens = await resolveZaiAuthTokens({ preferenceToken: "pref-token" });
        assert.deepEqual(tokens, {
          primaryToken: "direct-zai-token",
          localToken: "direct-zai-token",
          preferenceToken: "pref-token",
        });
      },
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("resolveZaiAuthTokens falls back to preference token when local lookup is empty", async () => {
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
        assert.deepEqual(tokens, {
          primaryToken: "pref-token",
          localToken: null,
          preferenceToken: "pref-token",
        });
      },
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("shouldFallbackToPreferenceToken is true only for unauthorized local-token failures", async () => {
  const { shouldFallbackToPreferenceToken } = await import("./auth");

  assert.equal(
    shouldFallbackToPreferenceToken({
      localToken: "local-token",
      preferenceToken: "pref-token",
      errorType: "unauthorized",
    }),
    true,
  );

  assert.equal(
    shouldFallbackToPreferenceToken({
      localToken: "local-token",
      preferenceToken: "local-token",
      errorType: "unauthorized",
    }),
    false,
  );

  assert.equal(
    shouldFallbackToPreferenceToken({
      localToken: "local-token",
      preferenceToken: "pref-token",
      errorType: "network_error",
    }),
    false,
  );

  assert.equal(
    shouldFallbackToPreferenceToken({
      localToken: null,
      preferenceToken: "pref-token",
      errorType: "unauthorized",
    }),
    false,
  );
});
