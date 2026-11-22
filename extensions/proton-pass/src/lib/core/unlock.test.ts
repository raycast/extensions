import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { CommandDescriptor } from "./exec";
import { unlockCommandLine, unlockSession } from "./unlock";
import { PassCliError } from "../types";

const fakeCli = resolve("src/lib/testing/fake-pass-cli.mjs");
// The fake pass-cli's lock code: see fake-pass-cli.mjs.
const LOCK_CODE = "example-123";
// The unlock runs pass-cli in a terminal of its own, which only macOS's `script` provides.
const onMac = { skip: process.platform !== "darwin" };

function fakeCommand(mode: string): CommandDescriptor {
  return { file: process.execPath, args: [fakeCli, mode] };
}

function withLog<T>(run: (log: string) => Promise<T>): Promise<T> {
  const dir = mkdtempSync(join(tmpdir(), "pass-unlock-"));
  return run(join(dir, "calls.log")).finally(() => rmSync(dir, { recursive: true, force: true }));
}

const failsWith =
  (type: string, check: (message: string) => void = () => undefined) =>
  (error: unknown) => {
    assert.ok(error instanceof PassCliError, String(error));
    assert.equal(error.type, type);
    check(error.message);
    return true;
  };

test("unlocks with the code typed at pass-cli's own prompt, never in its arguments or environment", onMac, async () => {
  await withLog(async (log) => {
    const outcome = await unlockSession(fakeCommand("unlock"), LOCK_CODE, {
      env: { ...process.env, FAKE_PASS_CLI_LOG: log },
    });

    assert.equal(outcome, "unlocked");
    const calls = readFileSync(log, "utf8").trim().split("\n");
    assert.equal(calls.length, 1);
    assert.deepEqual(JSON.parse(calls[0]).args, ["session", "unlock"]);
    assert.ok(!calls[0].includes(LOCK_CODE));
  });
});

test(
  "a wrong code fails with pass-cli's reason, without the code, even from a terminal that shows it",
  onMac,
  async () => {
    const withoutCode = (code: string) => (message: string) => {
      assert.match(message, /InvalidValue/);
      assert.ok(!message.includes(code), message);
      assert.ok(!message.includes("Enter lock code"), message);
    };
    await assert.rejects(
      unlockSession(fakeCommand("unlock"), "example-999"),
      failsWith("unknown", withoutCode("example-999")),
    );
    await assert.rejects(
      unlockSession(fakeCommand("unlock-echo"), LOCK_CODE),
      failsWith("unknown", withoutCode(LOCK_CODE)),
    );
  },
);

test("a session that isn't locked anymore, or has no lock anymore, needs no code", onMac, async () => {
  const started = Date.now();
  assert.equal(await unlockSession(fakeCommand("unlock-not-locked"), LOCK_CODE), "not_locked");
  assert.equal(await unlockSession(fakeCommand("unlock-no-lock"), LOCK_CODE), "not_locked");
  // Without a prompt, nothing waits for one.
  assert.ok(Date.now() - started < 5_000);
});

test("a session ended by Proton, e.g. after too many wrong codes, counts as logged out", onMac, async () => {
  await assert.rejects(unlockSession(fakeCommand("unlock-logged-out"), LOCK_CODE), failsWith("not_authenticated"));
});

test("a pass-cli that never asks for the code is stopped rather than waited for", onMac, async () => {
  const started = Date.now();
  await assert.rejects(
    unlockSession(fakeCommand("unlock-hang"), LOCK_CODE, { promptTimeout: 300 }),
    failsWith("timeout"),
  );
  assert.ok(Date.now() - started < 5_000);
});

test("the unlock command to run in a terminal keeps a path with spaces whole", () => {
  assert.equal(
    unlockCommandLine("/Users/someone/My Tools/pass-cli", "darwin"),
    "'/Users/someone/My Tools/pass-cli' session unlock",
  );
  assert.equal(
    unlockCommandLine("C:\\Users\\someone\\O'Brien\\pass-cli.exe", "win32"),
    "& 'C:\\Users\\someone\\O''Brien\\pass-cli.exe' session unlock",
  );
});
