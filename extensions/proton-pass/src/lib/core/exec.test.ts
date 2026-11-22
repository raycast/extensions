import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { classifyCliError, CommandDescriptor, execCli, normalizeCliExecutionError } from "./exec";

const fakeCli = resolve("src/lib/testing/fake-pass-cli.mjs");

function fakeCommand(mode: string): CommandDescriptor {
  return { file: process.execPath, args: [fakeCli, mode] };
}

test("executes a command descriptor with appended arguments", async () => {
  const result = await execCli(fakeCommand("echo-args"), ["info", "--output", "json"]);

  assert.deepEqual(JSON.parse(result.stdout), ["info", "--output", "json"]);
  assert.equal(result.stderr, "");
});

test("classifies authentication and keyring failures", () => {
  assert.equal(classifyCliError("Error: This operation requires an authenticated client"), "not_authenticated");
  assert.equal(classifyCliError("cannot get the encryption key"), "keyring_error");
});

test("normalizes a missing executable with its path", () => {
  const error = Object.assign(new Error("spawn failed"), { code: "ENOENT" });

  const normalized = normalizeCliExecutionError(error, "/missing/pass-cli");

  assert.equal(normalized.type, "not_installed");
  assert.match(normalized.message, /\/missing\/pass-cli/);
});

test("normalizes the real fake CLI authentication failure", async () => {
  await assert.rejects(execCli(fakeCommand("auth-denied"), ["info"]), (error: unknown) => {
    const normalized = normalizeCliExecutionError(error, process.execPath);
    assert.equal(normalized.type, "not_authenticated");
    assert.doesNotMatch(normalized.message, /authenticated client/);
    return true;
  });
});

test("keeps the pass-cli command line out of error messages", () => {
  const error = Object.assign(
    new Error("Command failed: /Users/someone/pass-cli item view --share-id=SHARE --item-id=ITEM\nerror: boom"),
    { stderr: "error: boom\n" },
  );

  const normalized = normalizeCliExecutionError(error, "/Users/someone/pass-cli");

  assert.equal(normalized.type, "unknown");
  assert.equal(normalized.message, "error: boom");

  const withoutStderr = normalizeCliExecutionError(
    new Error("Command failed: /Users/someone/pass-cli item view --item-id=ITEM\nkilled"),
    "/Users/someone/pass-cli",
  );
  assert.equal(withoutStderr.message, "killed");
});

test("a locked session is told apart from an ended one, which pass-cli reports after too many wrong codes", () => {
  // pass-cli 2.7.1 (pass/src/macros.rs): every command Proton refuses while the session is locked.
  const locked =
    "Session is locked. Please unlock your session and try again.\nError: Could not perform operation. Reason: SessionLocked";
  assert.equal(classifyCliError(locked), "session_locked");
  assert.equal(classifyCliError("Error: Could not perform operation. Reason: SessionLocked"), "session_locked");
  // pass-cli/src/main.rs, once Proton has ended the session.
  const invalidated =
    "Your session has been invalidated and you have been logged out automatically.\nPlease log in again with: pass login";
  assert.equal(classifyCliError(invalidated), "not_authenticated");
});

test("a command refused by a locked session says so in the extension's words", async () => {
  await assert.rejects(execCli(fakeCommand("locked"), ["vault", "list"]), (error: unknown) => {
    const normalized = normalizeCliExecutionError(error, process.execPath);
    assert.equal(normalized.type, "session_locked");
    assert.equal(normalized.message, "Your pass-cli session is locked.");
    return true;
  });
});
