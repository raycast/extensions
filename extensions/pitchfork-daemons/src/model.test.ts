import assert from "node:assert/strict";
import { test } from "node:test";
import {
  daemonActions,
  daemonUrl,
  decode,
  formatElapsed,
  groupActions,
  groupTargets,
  isSupervisorDown,
  namespaceOf,
} from "./model.ts";

const daemon = (status: string, extra = {}) => ({ id: "ns/web", pid: null, status, ...extra });

test("decode rejects unexpected JSON", () => {
  assert.deepEqual(decode('[{"id":"a/b","status":"running"}]').length, 1);
  assert.throws(() => decode('{"id":"a/b"}'));
});

test("lifecycle actions follow Pitchfork statuses", () => {
  assert.deepEqual(daemonActions(daemon("running")), ["stop", "restart"]);
  assert.deepEqual(daemonActions(daemon("waiting")), ["stop"]);
  assert.deepEqual(daemonActions(daemon("errored")), ["start", "stop"]);
  assert.deepEqual(daemonActions(daemon("stopping")), []);
  assert.deepEqual(daemonActions(daemon("completed")), ["start"]);
  assert.deepEqual(daemonActions(daemon("stopped", { disabled: true })), []);
  assert.deepEqual(daemonActions(daemon("running", { disabled: true })), ["stop"]);
});

test("group actions skip daemons that can't take them and pause during transitions", () => {
  const group = [daemon("running", { id: "ns/a" }), daemon("stopped", { id: "ns/b" })];
  assert.deepEqual(groupActions(group), ["start", "restart", "stop"]);
  assert.deepEqual(groupTargets(group, "restart"), ["ns/a"]);
  assert.deepEqual(groupActions([...group, daemon("stopping")]), []);
});

test("urls only for running daemons, proxy first", () => {
  assert.equal(daemonUrl(daemon("stopped", { proxy_url: "http://x.localhost:8080" })), null);
  assert.equal(
    daemonUrl(daemon("running", { proxy_url: "http://x.localhost:8080", active_port: 3000 })),
    "http://x.localhost:8080",
  );
  assert.equal(daemonUrl(daemon("running", { active_port: 3000 })), "http://localhost:3000");
});

test("helpers", () => {
  assert.equal(namespaceOf({ id: "a/b", pid: null, status: "running" }), "a");
  assert.equal(formatElapsed("01:02:03"), "1h 2m");
  assert.equal(formatElapsed("3-04:00:00"), "3d 4h");
  assert.ok(isSupervisorDown("Error: connection_failed"));
});
