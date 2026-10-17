import assert from "node:assert/strict";
import { resolve } from "node:path";
import { test } from "node:test";
import { findCodex, readAppServerUsage } from "../src/lib/codex";
import { isRecord, parseUsage } from "../src/lib/usage";

const fixture = resolve(__dirname, "fixtures/app-server.mjs");
const helper = resolve(__dirname, "../assets/codex-usage-helper");

function read(scenario = "success", timeoutMs = 2000, signal?: AbortSignal) {
  return readAppServerUsage(process.execPath, helper, { args: [fixture, scenario], timeoutMs, signal });
}

test("performs the complete initialization and account handshake", async () => {
  const result = await read();
  const usage = parseUsage(result.payload, result.planType);
  assert.equal(usage.windows[0].remainingPercent, 71);
  assert.equal(usage.windows[1].remainingPercent, 44);
  assert.equal(result.planType, "plus");
  assert.ok(!JSON.stringify(result).includes("private@example.com"));
});

test("handles fragmented stdout and ignores unrelated messages", async () => {
  const result = await read("chunked");
  assert.equal(parseUsage(result.payload, result.planType).windows[0].remainingPercent, 71);
});

test("the native helper stops and reaps its Codex child before returning", async () => {
  const result = await read();
  assert.ok(isRecord(result.payload));
  const pid = result.payload.serverPid;
  assert.equal(typeof pid, "number");
  assert.throws(() => process.kill(pid as number, 0), { code: "ESRCH" });
});

test("explains how to sign in when Codex is signed out", async () => {
  await assert.rejects(read("signed-out"), /codex login.*ChatGPT/);
});

test("does not query paid API-key usage as if it were subscription usage", async () => {
  await assert.rejects(read("api-key"), /API key cannot read subscription limits/);
});

test("reports initialization errors without exposing raw server messages", async () => {
  await assert.rejects(read("init-error"), /Could not initialize Codex App Server/);
});

test("reports usage service failures", async () => {
  await assert.rejects(read("usage-error"), /Could not read subscription usage/);
});

test("rejects malformed protocol data", async () => {
  await assert.rejects(read("malformed"), /invalid protocol data/);
});

test("rejects a premature child-process exit", async () => {
  await assert.rejects(read("exit"), /exited before returning usage/);
});

test("times out an unresponsive server", async () => {
  await assert.rejects(read("timeout", 150), /timed out/);
});

test("cancels a pending refresh", async () => {
  const controller = new AbortController();
  const pending = read("timeout", 2000, controller.signal);
  controller.abort();
  await assert.rejects(pending, /cancelled/);
});

test("does not spawn a process when already cancelled", async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(read("success", 2000, controller.signal), /cancelled/);
});

test("reports missing executables", async () => {
  await assert.rejects(readAppServerUsage("/does-not-exist/codex", helper), /Could not start Codex/);
  await assert.rejects(findCodex("/does-not-exist/codex"), /configured path/);
});

test("honors a configured executable path and trims surrounding whitespace", async () => {
  assert.equal(await findCodex(process.execPath), process.execPath);
  assert.equal(await findCodex(` ${process.execPath} `), process.execPath);
});
