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

test("resolveCodexAuthToken prefers local Codex login token over preference token", async () => {
  const { resolveCodexAuthToken } = await import("./auth");
  const { dir, filePath } = makeTempFile(JSON.stringify({ tokens: { access_token: "local-token" } }));

  try {
    const token = resolveCodexAuthToken({
      preferenceToken: "pref-token",
      authFilePath: filePath,
    });

    assert.equal(token, "local-token");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("resolveCodexAuthToken falls back to preference token when local auth file is missing", async () => {
  const { resolveCodexAuthToken } = await import("./auth");

  const token = resolveCodexAuthToken({
    preferenceToken: "pref-token",
    authFilePath: path.join(os.tmpdir(), `missing-${Date.now()}.json`),
  });

  assert.equal(token, "pref-token");
});

test("resolveCodexAuthToken returns null when both local and preference tokens are unavailable", async () => {
  const { resolveCodexAuthToken } = await import("./auth");

  const token = resolveCodexAuthToken({
    preferenceToken: "   ",
    authFilePath: path.join(os.tmpdir(), `missing-${Date.now()}-empty.json`),
  });

  assert.equal(token, null);
});

test("normalizeCodexAuthorizationHeader adds Bearer prefix when missing", async () => {
  const { normalizeCodexAuthorizationHeader } = await import("./auth");

  assert.equal(normalizeCodexAuthorizationHeader("abc-token"), "Bearer abc-token");
  assert.equal(normalizeCodexAuthorizationHeader("Bearer already"), "Bearer already");
});

test("resolveCodexAuthTokens exposes primary/local/preference tokens", async () => {
  const { resolveCodexAuthTokens } = await import("./auth");
  const { dir, filePath } = makeTempFile(JSON.stringify({ tokens: { access_token: "local-token" } }));

  try {
    const tokens = resolveCodexAuthTokens({
      preferenceToken: "pref-token",
      authFilePath: filePath,
    });

    assert.deepEqual(tokens, {
      primaryToken: "local-token",
      localToken: "local-token",
      preferenceToken: "pref-token",
    });
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

  assert.equal(
    shouldFallbackToPreferenceToken({
      localToken: "local-token",
      preferenceToken: null,
      errorType: "unauthorized",
    }),
    false,
  );
});
