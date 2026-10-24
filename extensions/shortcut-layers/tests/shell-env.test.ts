import assert from "node:assert/strict";
import { test } from "node:test";
import { sanitizeShellEnvironment } from "../src/shell-env";

test("sanitizeShellEnvironment drops non-POSIX locale values", () => {
  const env = sanitizeShellEnvironment({
    LC_TIME: "en-CZ-u-ca-gregory",
    LANG: "en_US.UTF-8",
    LC_CTYPE: "UTF-8",
    PATH: "/usr/bin",
  });
  assert.equal(env.LC_TIME, undefined);
  assert.equal(env.LANG, "en_US.UTF-8");
  assert.equal(env.LC_CTYPE, "UTF-8");
  assert.equal(env.PATH, "/usr/bin");
});

test("sanitizeShellEnvironment leaves non-locale LC_* vars alone", () => {
  const env = sanitizeShellEnvironment({ LC_TERMINAL: "iTerm2" });
  assert.equal(env.LC_TERMINAL, "iTerm2");
});
