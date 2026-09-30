import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { sanitizeShellEnvironment } from "../src/shell-env.ts";

const execFileAsync = promisify(execFile);

const EXTENDED_LOCALE =
  "en-CZ-u-ca-gregory-co-standard-cu-czk-fw-mon-hc-h23-ms-metric-tz-czprg";

test("strips LC_ALL set to a macOS extended locale identifier", () => {
  const env = sanitizeShellEnvironment({ LC_ALL: EXTENDED_LOCALE });
  assert.equal(env.LC_ALL, undefined);
});

test("strips LANG set to a macOS extended locale identifier", () => {
  const env = sanitizeShellEnvironment({ LANG: "en-CZ-u-ca-gregory" });
  assert.equal(env.LANG, undefined);
});

test("strips any LC_* variable set to a non-POSIX locale value", () => {
  const env = sanitizeShellEnvironment({ LC_TIME: EXTENDED_LOCALE });
  assert.equal(env.LC_TIME, undefined);
});

test("preserves valid POSIX locale values", () => {
  for (const value of ["en_US.UTF-8", "C", "C.UTF-8", "POSIX", "zh_Hans_CN.UTF-8"]) {
    const env = sanitizeShellEnvironment({ LC_ALL: value });
    assert.equal(env.LC_ALL, value, `expected ${value} to be preserved`);
  }
});

test("preserves the macOS Terminal LC_CTYPE=UTF-8 convention", () => {
  const env = sanitizeShellEnvironment({ LC_CTYPE: "UTF-8" });
  assert.equal(env.LC_CTYPE, "UTF-8");
});

test("leaves non-locale LC_* variables untouched", () => {
  const env = sanitizeShellEnvironment({
    LC_TERMINAL: "iTerm2",
    LC_TERMINAL_PROGRAM: "/Applications/iTerm.app",
  });
  assert.equal(env.LC_TERMINAL, "iTerm2");
  assert.equal(env.LC_TERMINAL_PROGRAM, "/Applications/iTerm.app");
});

test("leaves non-locale environment variables untouched", () => {
  const env = sanitizeShellEnvironment({
    PATH: "/usr/bin:/bin",
    HOME: "/Users/test",
    LC_ALL: EXTENDED_LOCALE,
  });
  assert.equal(env.PATH, "/usr/bin:/bin");
  assert.equal(env.HOME, "/Users/test");
});

test("does not mutate the input environment", () => {
  const input = { LC_ALL: EXTENDED_LOCALE };
  sanitizeShellEnvironment(input);
  assert.equal(input.LC_ALL, EXTENDED_LOCALE);
});

test("a spawned shell does not inherit the extended locale identifier", async () => {
  const env = sanitizeShellEnvironment({
    PATH: process.env.PATH,
    LC_ALL: EXTENDED_LOCALE,
  });
  const { stdout } = await execFileAsync(
    "/bin/sh",
    ["-c", 'printf %s "${LC_ALL-}"'],
    { env },
  );
  assert.equal(stdout, "");
});
