import assert from "node:assert/strict";
import test from "node:test";
import {
  isSameProcess,
  readProcessIdentity,
  spawnDetached,
} from "../src/lib/process.ts";

test("rejects a reused PID whose process identity no longer matches", () => {
  const identity = readProcessIdentity(process.pid);
  assert.ok(identity);
  assert.equal(isSameProcess(identity), true);
  assert.equal(
    isSameProcess({ ...identity, startedAt: "Thu Jan  1 00:00:00 1970" }),
    false,
  );
});

test("rejects an unexpected executable for a live PID", () => {
  assert.equal(
    readProcessIdentity(process.pid, "/not/the/current/executable"),
    undefined,
  );
});

test("captures the identity of a newly spawned detached process", async () => {
  const identity = await spawnDetached("/bin/sleep", ["5"]);
  try {
    assert.equal(identity.executable, "/bin/sleep");
    assert.equal(isSameProcess(identity), true);
  } finally {
    if (isSameProcess(identity)) process.kill(identity.pid, "SIGTERM");
  }
});
