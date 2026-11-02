import assert from "node:assert/strict";
import test from "node:test";
import { parseSessionTarget, hcGroup, hcStatus } from "./session-target.js";
import type { HcEntry } from "./herdr.js";

test("recent targets accept legacy bridges and keep HC identities exact without alias fallback", () => {
  const native = { profileId: "work", bindingId: "session", connectionKey: "a".repeat(24) };
  assert.deepEqual(parseSessionTarget(JSON.stringify(native)), native);
  const hc = {
    kind: "hc",
    socketPath: "/private/my socket/core.sock",
    hostCoreId: "host-id",
    coreId: "remote-id",
    terminalId: "t7",
  };
  assert.deepEqual(parseSessionTarget(JSON.stringify(hc)), hc);
  for (const change of [
    { terminalId: "vps/t7" },
    { coreId: "vps/t7" },
    { socketPath: "relative.sock" },
    { hostCoreId: "" },
    { kind: "other" },
  ])
    assert.throws(() => parseSessionTarget(JSON.stringify({ ...hc, ...change })));
});
test("HC grouping never calls an unreported or unknown program ready", () => {
  const entry: HcEntry = {
    target: { kind: "hc", socketPath: "/private/core.sock", hostCoreId: "host", coreId: "host", terminalId: "t7" },
    terminal: { address: "t7", labels: {}, argv: [], cwd: "/", state: "running", created_ms: 1 },
    machine: "Mac",
    connected: true,
  };
  assert.equal(hcStatus(entry), "Unknown");
  entry.terminal.status = { state: "idle" };
  assert.equal(hcStatus(entry), "Unknown");
  entry.terminal.reported = true;
  assert.equal(hcStatus(entry), "Idle");
  entry.terminal.status.state = "done";
  assert.equal(hcStatus(entry), "Ready");
  assert.equal(hcGroup(entry), "Online");
  entry.terminal.status.state = "blocked";
  assert.equal(hcGroup(entry), "Needs Attention");
  entry.terminal.status.state = "future-state";
  assert.equal(hcStatus(entry), "Unknown");
  entry.connected = false;
  assert.equal(hcGroup(entry), "Offline");
});
