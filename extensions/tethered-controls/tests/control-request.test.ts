import assert from "node:assert/strict";
import { test } from "node:test";
import { requestControl } from "../src/control-request.ts";

function fixture(replies: unknown[]) {
  let time = 0;
  let reads = 0;
  const sent: string[] = [];
  const dependencies = {
    isRunning: async () => true,
    requestID: () => "owned-request",
    send: async (url: string) => {
      sent.push(url);
    },
    readResponses: async () => replies[Math.min(reads++, replies.length - 1)],
    now: () => time,
    sleep: async (milliseconds: number) => {
      time += milliseconds;
    },
  };
  return { dependencies, sent, reads: () => reads, elapsed: () => time };
}

function reply(success: boolean, message: string, request = "owned-request") {
  return { request, success, message };
}

test("returns a matching success and preserves control parameters", async () => {
  const setup = fixture([{ "owned-request": reply(true, "Profile applied.") }]);
  assert.equal(await requestControl("/profile/apply?name=Quiet%20%26%20Cool", setup.dependencies), "Profile applied.");
  const sent = new URL(setup.sent[0]);
  assert.equal(sent.pathname, "/profile/apply");
  assert.equal(sent.searchParams.get("name"), "Quiet & Cool");
  assert.equal(sent.searchParams.get("request"), "owned-request");
  assert.equal(setup.reads(), 1);
  assert.equal(setup.elapsed(), 0);
});

test("surfaces the app rejection instead of success", async () => {
  const setup = fixture([{ "owned-request": reply(false, "Topup requires AC power.") }]);
  await assert.rejects(requestControl("/topup/enable", setup.dependencies), { message: "Topup requires AC power." });
  assert.equal(setup.reads(), 1);
});

test("ignores unrelated requests and mismatched embedded IDs before accepting its own response", async () => {
  const setup = fixture([
    { other: reply(false, "Unrelated rejection", "other") },
    { "owned-request": reply(true, "Wrong success", "other") },
    { "owned-request": reply(true, "Caffeinate started.") },
  ]);
  assert.equal(await requestControl("/caffeinate/start", setup.dependencies), "Caffeinate started.");
  assert.equal(setup.reads(), 3);
  assert.equal(setup.elapsed(), 300);
});

test("times out with an uncertain-outcome error when no matching valid response arrives", async () => {
  const setup = fixture([{ "owned-request": { request: "owned-request", success: "true", message: "Invalid" } }]);
  await assert.rejects(requestControl("/sailing/enable", setup.dependencies), /did not confirm.*may have succeeded/);
  assert.equal(setup.elapsed(), 30000);
  assert.equal(setup.reads(), 200);
  assert.equal(setup.sent.length, 1);
});
