import assert from "node:assert/strict";
import test from "node:test";
import {
  ClaudeOAuthCredentialError,
  parseClaudeOAuthCredential,
} from "../src/lib/claude-oauth-credential-core.ts";

const ACCESS_TOKEN = "full-scope-oauth-token-value";

test("parses a current full-scope Claude login credential", () => {
  const credential = parseClaudeOAuthCredential(
    JSON.stringify({
      claudeAiOauth: {
        accessToken: ACCESS_TOKEN,
        expiresAt: 2_000,
        scopes: ["user:profile", "user:inference"],
      },
    }),
    1_000,
  );
  assert.equal(credential.accessToken, ACCESS_TOKEN);
  assert.deepEqual(credential.scopes, ["user:profile", "user:inference"]);
});

test("rejects inference-only setup tokens", () => {
  assert.throws(
    () =>
      parseClaudeOAuthCredential(
        JSON.stringify({
          claudeAiOauth: {
            accessToken: ACCESS_TOKEN,
            expiresAt: 2_000,
            scopes: ["user:inference"],
          },
        }),
        1_000,
      ),
    (error: unknown) => {
      assert.ok(error instanceof ClaudeOAuthCredentialError);
      assert.match(error.message, /claude auth login/i);
      assert.doesNotMatch(error.message, new RegExp(ACCESS_TOKEN));
      return true;
    },
  );
});

test("rejects expired and malformed credentials without exposing tokens", () => {
  for (const serialized of [
    JSON.stringify({
      claudeAiOauth: {
        accessToken: ACCESS_TOKEN,
        expiresAt: 999,
        scopes: ["user:profile"],
      },
    }),
    JSON.stringify({ claudeAiOauth: { accessToken: ACCESS_TOKEN } }),
    "not-json",
  ]) {
    assert.throws(
      () => parseClaudeOAuthCredential(serialized, 1_000),
      (error: unknown) => {
        assert.ok(error instanceof ClaudeOAuthCredentialError);
        assert.doesNotMatch(error.message, new RegExp(ACCESS_TOKEN));
        return true;
      },
    );
  }
});
