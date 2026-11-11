import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test, type TestContext } from "node:test";
import { createWindscribe, parseStatus, WindscribeError } from "../src/windscribe.ts";

const disconnected = "Login: Logged in\nConnection: Disconnected";
const connected = "Login: Logged in\nConnection: Connected to London\nProtocol: WireGuard:443";
const connecting = "Login state: Logged in\nConnect state: Connecting: London";
const disconnecting = "Login: Logged in\nConnection: Disconnecting";
const unknown = "Login: Logged in\nConnection: Unexpected state";

const legacyConnected = [
  '{"lvl":"info","mod":"cli","msg":"Windscribe status output"}',
  "Internet connectivity: available",
  "Login state: Logged in",
  "Firewall state: On",
  "Connect state: Connected: London - 203.0.113.9",
  "Protocol: WireGuard:443",
  "VPN IP: 203.0.113.9",
].join("\n");

async function testPath(t: TestContext) {
  const path = await mkdtemp(join(tmpdir(), "raycast-windscribe-"));
  t.after(() => rm(path, { recursive: true, force: true }));
  return path;
}

async function fixture(t: TestContext, outputs: Array<string | Error>, confirmationTimeoutMs = 1_000) {
  const calls: string[][] = [];
  const run = async (args: readonly string[]) => {
    calls.push([...args]);
    const output = outputs.shift();
    if (output instanceof Error) throw output;
    assert.notEqual(output, undefined, `Unexpected CLI call: ${args.join(" ")}`);
    return output as string;
  };
  const client = createWindscribe(await testPath(t), { run, pollIntervalMs: 1, confirmationTimeoutMs });
  return { client, calls };
}

test("parses the installed and newer status formats, omitting the appended VPN IP", () => {
  for (const output of [legacyConnected, connected]) {
    const status = parseStatus(output);
    assert.equal(status.state, "connected");
    assert.equal(status.location, "London");
    assert.equal(status.protocol, "WireGuard:443");
  }
  assert.equal(parseStatus(legacyConnected.replaceAll("203.0.113.9", "2001:db8::1")).location, "London");
  assert.equal(parseStatus(legacyConnected.replace(" - 203.0.113.9", " - Docklands")).location, "London - Docklands");
});

test("distinguishes disconnected, transitional, signed-out, failed, and unrecognized states", () => {
  assert.equal(parseStatus(disconnected).state, "disconnected");
  assert.equal(parseStatus("Login state: Logged in\nConnect state: Disconnected").state, "disconnected");
  assert.equal(parseStatus(connecting).state, "connecting");
  assert.equal(parseStatus("Login state: Logged in\nConnect state: Connecting:").state, "connecting");
  assert.equal(parseStatus(disconnecting).state, "disconnecting");
  assert.equal(parseStatus("Login: Logged out").state, "signed-out");
  assert.equal(parseStatus("Login state: Logging in").state, "signing-in");
  assert.equal(parseStatus("Login state: Error: Session expired").state, "signed-out");
  assert.equal(parseStatus("Login: Logged in\nConnection: Error: Out of data").state, "failed");
  assert.throws(() => parseStatus(unknown), { code: "unknown-status" });
});

test("treats a pending tunnel check as connecting and surfaces network interference", () => {
  for (const output of [
    connected.replace("London", "London (checking the connection)"),
    legacyConnected.replace("Connect state:", "*Connect state:"),
  ]) {
    const pending = parseStatus(output);
    assert.equal(pending.state, "connecting");
    assert.equal(pending.location, "London");
  }
  assert.equal(parseStatus("Login: Logged in\nConnection: Connected (checking the connection)").state, "connecting");
  assert.match(
    parseStatus("Login: Logged in\nConnection: Connected (network interference detected)").detail ?? "",
    /network interference/i,
  );
  for (const output of [
    connected.replace("London", "London (network interference detected)"),
    legacyConnected.replace(
      "Connected: London - 203.0.113.9",
      "Connected: London - 203.0.113.9 [Network interference]",
    ),
  ]) {
    const status = parseStatus(output);
    assert.equal(status.location, "London");
    assert.match(status.detail ?? "", /network interference/i);
  }
});

test("connects to the last location and confirms status even when the request only reports progress", async (t) => {
  const { client, calls } = await fixture(t, [disconnected, "Connection is in progress.", connecting, legacyConnected]);
  assert.deepEqual(await client.control("connect"), { state: "connected", message: "London" });
  assert.deepEqual(calls, [["status"], ["connect", "-n"], ["status"], ["status"]]);
});

test("selects Best Location when disconnected and prompts the user when already connected", async (t) => {
  const { client, calls } = await fixture(t, [disconnected, "", connected, connected]);
  assert.equal((await client.control("best")).state, "connected");
  const result = await client.control("best");
  assert.equal(result.state, "already-connected");
  assert.match(result.message ?? "", /London.*Disconnect first/);
  assert.deepEqual(calls, [["status"], ["connect", "-n", "best"], ["status"], ["status"]]);
});

test("disconnects an active VPN and leaves an already disconnected VPN alone", async (t) => {
  const { client, calls } = await fixture(t, [connected, "", disconnecting, disconnected, disconnected]);
  assert.equal((await client.control("disconnect")).state, "disconnected");
  assert.equal((await client.control("disconnect")).state, "already-disconnected");
  assert.deepEqual(calls, [["status"], ["disconnect", "-n"], ["status"], ["status"], ["status"]]);
});

test("toggles both ways using fresh status, and does not interrupt a transition", async (t) => {
  const { client, calls } = await fixture(t, [disconnected, "", connected, connected, "", disconnected, connecting]);
  assert.equal((await client.control("toggle")).state, "connected");
  assert.equal((await client.control("toggle")).state, "disconnected");
  assert.equal((await client.control("toggle")).state, "in-progress");
  assert.deepEqual(calls, [
    ["status"],
    ["connect", "-n"],
    ["status"],
    ["status"],
    ["disconnect", "-n"],
    ["status"],
    ["status"],
  ]);
});

test("rejects overlapping commands and releases the lock after a failed read", async (t) => {
  const path = await testPath(t);
  const entered = Promise.withResolvers<void>();
  const pending = Promise.withResolvers<string>();
  const first = createWindscribe(path, {
    run: () => {
      entered.resolve();
      return pending.promise;
    },
  });
  const second = createWindscribe(path, { run: async () => disconnected });
  const operation = first.control("toggle");
  await entered.promise;
  try {
    await assert.rejects(second.control("toggle"), { code: "busy" });
    await assert.rejects(second.status(), { code: "busy" });
  } finally {
    pending.resolve(unknown);
    await assert.rejects(operation, { code: "unknown-status" });
  }
  assert.equal((await second.status()).state, "disconnected");
});

test("reports signed-out, unrecognized, missing, and unreachable statuses without sending a change", async (t) => {
  const { client, calls } = await fixture(t, [
    "Login: Logged out",
    unknown,
    new WindscribeError("missing", "Install Windscribe."),
    new WindscribeError("unreachable", "Open Windscribe."),
  ]);
  await assert.rejects(client.control("connect"), /sign in/i);
  await assert.rejects(client.control("toggle"), { code: "unknown-status" });
  await assert.rejects(client.control("disconnect"), { code: "missing" });
  await assert.rejects(client.control("best"), { code: "unreachable" });
  assert.deepEqual(calls, [["status"], ["status"], ["status"], ["status"]]);
});

test("retries a busy status read without resending the VPN request", async (t) => {
  const { client, calls } = await fixture(t, [disconnected, "", new WindscribeError("busy", "Busy"), connected]);
  assert.equal((await client.control("connect")).state, "connected");
  assert.deepEqual(calls, [["status"], ["connect", "-n"], ["status"], ["status"]]);
});

test("retries an unreadable status during reconnect without resending the VPN request", async (t) => {
  const { client, calls } = await fixture(t, [disconnected, "", unknown, connecting, connected]);
  assert.equal((await client.control("connect")).state, "connected");
  assert.deepEqual(calls, [["status"], ["connect", "-n"], ["status"], ["status"], ["status"]]);
});

test("reports a VPN failure returned during polling", async (t) => {
  const { client } = await fixture(t, [disconnected, "", "Login: Logged in\nConnection: Error: Out of data"]);
  await assert.rejects(client.control("connect"), /out of data/i);
});

test("reports a timeout when Windscribe never confirms the requested state", async (t) => {
  const calls: string[][] = [];
  const client = createWindscribe(await testPath(t), {
    run: async (args) => {
      calls.push([...args]);
      return disconnected;
    },
    confirmationTimeoutMs: 30,
    pollIntervalMs: 1,
  });
  await assert.rejects(client.control("connect"), { code: "unconfirmed" });
  assert.deepEqual(
    calls.filter(([command]) => command !== "status"),
    [["connect", "-n"]],
  );
});
