import assert from "node:assert/strict";
import test from "node:test";
import {
  buildClaudeLaunchArgs,
  buildShellCommandInDirectory,
  validateRalphOptions,
} from "../src/lib/terminal-core.ts";

test("quotes hostile macOS project paths before changing directory", () => {
  const cwd = "/tmp/$HOME/$(touch pwned)/`whoami`/quote'\\line\nnext";
  const command = buildShellCommandInDirectory("'claude' '--version'", cwd);
  assert.equal(
    command,
    `cd '/tmp/$HOME/$(touch pwned)/\`whoami\`/quote'"'"'\\line\nnext' && 'claude' '--version'`,
  );
});

test("bounds Ralph Loop iterations", () => {
  assert.doesNotThrow(() => validateRalphOptions("task", 1));
  assert.doesNotThrow(() => validateRalphOptions("task", 100));
  for (const value of [Number.NaN, -1, 0, 101, 1.5]) {
    assert.throws(
      () => validateRalphOptions("task", value),
      /whole number from 1 to 100/i,
    );
  }
  assert.throws(() => validateRalphOptions("  ", 10), /requires a task/i);
});

test("preserves every resume and fork flag", () => {
  assert.deepEqual(
    buildClaudeLaunchArgs({
      sessionId: "session-123",
      forkSession: true,
      permissionMode: "plan",
      model: "claude-opus-4-6",
      hasPrompt: true,
    }),
    ["-r", "session-123", "--fork-session", "--permission-mode", "plan"],
  );
});

test("uses model and worktree flags only for new sessions", () => {
  assert.deepEqual(
    buildClaudeLaunchArgs({
      worktree: true,
      model: "claude-sonnet-4-6",
      permissionMode: "acceptEdits",
    }),
    ["--worktree", "--permission-mode", "acceptEdits", "--model", "sonnet"],
  );
});

test("normalizes current Fable model IDs", () => {
  assert.deepEqual(buildClaudeLaunchArgs({ model: "claude-fable-5" }), [
    "--model",
    "fable",
  ]);
});

test("does not duplicate bypass permission flags", () => {
  assert.deepEqual(
    buildClaudeLaunchArgs({
      dangerouslySkipPermissions: true,
      permissionMode: "bypassPermissions",
      hasPrompt: true,
      printMode: true,
    }),
    ["--dangerously-skip-permissions", "-p"],
  );
});
