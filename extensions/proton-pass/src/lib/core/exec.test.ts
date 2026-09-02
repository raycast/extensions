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
