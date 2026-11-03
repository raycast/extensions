import assert from "node:assert/strict";
import { test } from "node:test";
import type { ServiceEvent } from "../src/digup/protocol";
import { ServiceError } from "../src/digup/protocol";
import { DigUpService, type ServiceOptions } from "../src/digup/service";
import { FakeChild } from "./fake-child";

const LAUNCH = { program: "/Applications/DigUp.app/Contents/Helpers/digup", args: ["search-service"], env: {} };

function started(options: ServiceOptions = {}) {
  const children: FakeChild[] = [];
  const service = new DigUpService(LAUNCH, {
    spawner: () => {
      const child = new FakeChild();
      children.push(child);
      return child;
    },
    killAfterMs: 5,
    ...options,
  });
  service.start();
  return { service, children, child: children[0] };
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const failedAs = (kind: string) => (error: unknown) => error instanceof ServiceError && error.kind === kind;
const settled = () => new Promise((resolve) => setImmediate(resolve));

test("semantic search refreshes a changed index; unchanged and keyword searches do not reload it", async () => {
  let revision = "first";
  const { service, child } = started({ readIndexRevision: async () => revision });
  async function search(meaning: boolean, reload: boolean) {
    const offset = child.requests.length;
    const pending = service.search({ q: "vessel on water", code: false, meaning });
    await settled();
    if (reload) {
      const request = child.requests[offset];
      assert.equal(request.op, "reload");
      child.say({ id: request.id, ok: true });
      await settled();
    }
    const requests = child.requests.slice(offset);
    assert.deepEqual(requests.map((r) => r.op), reload ? ["reload", "search"] : ["search"]);
    const request = requests.at(-1)!;
    child.say({ id: request.id, hits: [], strong: 0, meaning });
    await pending;
  }
  await search(true, true);
  await search(true, false);
  revision = "after indexing";
  await search(false, false);
  await search(true, true);
  service.stop();
  child.exit(0);
});

test("a rejected reload prevents search and is retried on the next query", async () => {
  const { service, child } = started({ readIndexRevision: async () => "changed" });
  const pending = service.search({ q: "boat", code: false, meaning: true });
  const rejection = assert.rejects(pending, /cannot read index/);
  await settled();
  child.say({ id: child.requests[0].id, ok: false, error: "cannot read index" });
  await rejection;
  assert.deepEqual(child.requests.map((r) => r.op), ["reload"]);
  const next = service.search({ q: "boat", code: false, meaning: true });
  await settled();
  assert.equal(child.requests[1].op, "reload");
  child.say({ id: child.requests[1].id, ok: true });
  await settled();
  child.say({ id: child.requests[2].id, hits: [], strong: 0, meaning: true });
  await next;
  service.stop();
  child.exit(0);
});

test("simultaneous semantic queries share one reload", async () => {
  const { service, child } = started({ readIndexRevision: async () => "changed" });
  const first = service.search({ q: "boat", code: false, meaning: true });
  const second = service.search({ q: "code", code: true, meaning: true });
  await settled();
  assert.deepEqual(child.requests.map((r) => r.op), ["reload"]);
  child.say({ id: child.requests[0].id, ok: true });
  await settled();
  for (const request of child.requests.filter((r) => r.op === "search")) {
    child.say({ id: request.id, hits: [], strong: 0, meaning: true });
  }
  await Promise.all([first, second]);
  service.stop();
  child.exit(0);
});

test("a replacement helper reloads even when the index revision has not changed", async () => {
  const { service, children } = started({ readIndexRevision: async () => "unchanged" });
  for (let attempt = 0; attempt < 2; attempt++) {
    const child = children[attempt];
    const search = service.search({ q: "boat", code: false, meaning: true });
    await settled();
    assert.equal(child.requests[0].op, "reload");
    child.say({ id: child.requests[0].id, ok: true });
    await settled();
    child.say({ id: child.requests[1].id, hits: [], strong: 0, meaning: true });
    await search;
    if (attempt === 0) child.exit(1);
  }
  service.stop();
  children[1].exit(0);
});

test("replies are matched to requests by id, in any order", async () => {
  const { service, child } = started();
  const first = service.request({ op: "status" }, 1000);
  const second = service.request({ op: "status" }, 1000);
  const [a, b] = child.requests;
  assert.notEqual(a.id, b.id);
  child.say({ id: b.id, which: "second" });
  child.say({ id: a.id, which: "first" });
  assert.equal((await first).which, "first");
  assert.equal((await second).which, "second");
});

test("the helper is warmed up as soon as it is ready, and its events are passed on", () => {
  const events: ServiceEvent[] = [];
  const { service, child } = started({ onEvent: (event) => events.push(event) });
  child.say({ event: "ready", index: "/idx" });
  child.say({ event: "encoder", state: "ready", seconds: 0.4 });
  child.raw("this line is not JSON\n");
  assert.deepEqual(
    child.requests.map((request) => request.op),
    ["prewarm"],
  );
  assert.deepEqual(events, [
    { event: "ready", index: "/idx" },
    { event: "encoder", state: "ready" },
  ]);
  service.stop();
  child.exit(0);
});

test("several lines in one chunk, and one line in several chunks, are all read", async () => {
  const { service, child } = started();
  const first = service.request({ op: "status" }, 1000);
  const second = service.request({ op: "status" }, 1000);
  const [a, b] = child.requests;
  const lines = JSON.stringify({ id: a.id, n: 1 }) + "\n" + JSON.stringify({ id: b.id, n: 2 }) + "\n";
  child.raw(lines.slice(0, 9));
  child.raw(lines.slice(9));
  assert.equal((await first).n, 1);
  assert.equal((await second).n, 2);
});

test("a reply cut in the middle of a character is put back together", async () => {
  const { service, child } = started();
  const reply = service.request({ op: "text", segment: 1 }, 1000);
  const line = Buffer.from(JSON.stringify({ id: child.requests[0].id, text: "租约 «宠物» café" }) + "\n");
  const cut = line.indexOf(Buffer.from("约")) + 1; // inside the three bytes of 约
  child.raw(line.subarray(0, cut));
  child.raw(line.subarray(cut));
  assert.equal((await reply).text, "租约 «宠物» café");
});

test("a helper that ends is started once more; the second time the extension is told", async () => {
  let failure: string | undefined;
  const { service, children } = started({ onFailed: (log) => (failure = log) });
  const waiting = service.request({ op: "status" }, 1000);
  children[0].complain("llama: out of memory\n");
  children[0].exit(1);
  await assert.rejects(waiting, failedAs("exited"));
  assert.equal(children.length, 2);
  assert.equal(failure, undefined);
  children[1].exit(1);
  assert.equal(children.length, 2);
  assert.equal(failure, "llama: out of memory");
  await assert.rejects(service.request({ op: "status" }, 1000), failedAs("exited"));
  service.start();
  assert.equal(children.length, 2);
});

test("a request that gets no answer fails, and the helper is replaced", async () => {
  const { service, children } = started();
  await assert.rejects(service.request({ op: "search", q: "zebra" }, 5), failedAs("timeout"));
  assert.equal(children[0].killed, true);
  assert.equal(children.length, 2);
  service.stop();
  children[1].exit(0);
});

test("a slow preview fails without replacing the helper", async () => {
  const { service, children } = started({ timeouts: { render: 5 } });
  await assert.rejects(service.render("/a.pdf", "pdf", 3, 800), failedAs("timeout"));
  assert.equal(children[0].killed, false);
  assert.equal(children.length, 1);
  service.stop();
  children[0].exit(0);
});

test("stopping asks the helper to quit, closes its input and does not start another", () => {
  const { service, children } = started();
  service.stop();
  assert.equal(children[0].requests.at(-1)?.op, "quit");
  assert.equal(children[0].ended, true);
  children[0].exit(0);
  assert.equal(children.length, 1);
});

test("a helper that ignores quit is ended", async () => {
  const { service, child } = started({ killAfterMs: 5 });
  service.stop();
  await pause(40);
  assert.equal(child.killed, true);
});

test("a keyword search asks for prefix matching; a meaning search does not", async () => {
  const { service, child } = started();
  const words = service.search({ q: "leas", code: false, meaning: false, kinds: ["pdf"] });
  const meaning = service.search({ q: "lease", code: true, meaning: true });
  const [first, second] = child.requests;
  assert.deepEqual(
    { ...first, id: 0 },
    { id: 0, op: "search", q: "leas", code: false, meaning: false, limit: 40, prefix_last: true, kinds: ["pdf"] },
  );
  assert.deepEqual({ ...second, id: 0 }, { id: 0, op: "search", q: "lease", code: true, meaning: true, limit: 40 });
  child.say({ id: first.id, hits: [], strong: 0, meaning: false });
  child.say({ id: second.id, ok: false, error: "no such table" });
  assert.deepEqual(await words, { hits: [], strong: 0, meaning: false });
  await assert.rejects(meaning, /no such table/);
});

test("the text of a segment, and a preview, come back as plain values", async () => {
  const { service, child } = started();
  const passage = service.text(72, false);
  const missing = service.text(77, true);
  const preview = service.render("/Users/sam/a b.pdf", "pdf", 3, 800);
  const failed = service.render("/gone.mp4", "video", undefined, 800);
  const [a, b, c, d] = child.requests;
  assert.deepEqual({ ...a, id: 0 }, { id: 0, op: "text", segment: 72, code: false });
  assert.deepEqual({ ...c, id: 0 }, { id: 0, op: "render", path: "/Users/sam/a b.pdf", kind: "pdf", pixels: 800, loc: 3 });
  assert.equal("loc" in d, false);
  child.say({ id: a.id, text: "Section 7. Pets." });
  child.say({ id: b.id, text: null });
  child.say({ id: c.id, image: "/idx/previews/1.jpg" });
  child.say({ id: d.id, ok: false, error: "no such file" });
  assert.equal(await passage, "Section 7. Pets.");
  assert.equal(await missing, null);
  assert.equal(await preview, "/idx/previews/1.jpg");
  await assert.rejects(failed, /no such file/);
});

test("embedding ahead never surfaces a failure", async () => {
  const { service, child } = started();
  service.embedAhead("zebra", false);
  assert.deepEqual({ ...child.requests[0], id: 0 }, { id: 0, op: "embed_ahead", q: "zebra", code: false });
  service.stop();
  child.exit(0);
  await pause(5); // an unhandled rejection here would fail the test run
});

test("a real helper that stops reading its input does not take the process down", async () => {
  const service = new DigUpService(
    { program: process.execPath, args: ["-e", "process.stdin.destroy(); setTimeout(() => {}, 3000)"], env: {} },
    { killAfterMs: 10 },
  );
  service.start();
  await pause(300);
  await assert.rejects(service.request({ op: "search", q: "x".repeat(300_000) }, 150), ServiceError);
  service.stop();
  await pause(100);
});

test("while the helper warms up a search waits instead of timing out; once warm, timeouts count again", async () => {
  const { service, children } = started({ timeouts: { request: 20 } });
  const child = children[0];
  child.say({ event: "ready", index: "/idx" });
  const prewarm = child.requests.find((request) => request.op === "prewarm");
  assert.ok(prewarm, "the warm-up was asked for");
  const search = service.search({ q: "zebra", code: false, meaning: false });
  await pause(90); // several timeouts' worth: loading the model and the vectors of a big index takes this long
  assert.equal(child.killed, false);
  assert.equal(children.length, 1);

  child.say({ id: prewarm.id, ok: true });
  const asked = child.requests.find((request) => request.op === "search");
  assert.ok(asked);
  child.say({ id: asked.id, hits: [], strong: 0, meaning: false });
  assert.deepEqual(await search, { hits: [], strong: 0, meaning: false });

  await assert.rejects(service.search({ q: "stuck", code: false, meaning: false }), failedAs("timeout"));
  assert.equal(child.killed, true);
  service.stop();
  children[1].exit(0);
});

test("a helper that ends while warming up is not waited for", async () => {
  const { service, children } = started({ timeouts: { request: 20 } });
  children[0].say({ event: "ready", index: "/idx" });
  const search = service.search({ q: "zebra", code: false, meaning: false });
  children[0].exit(1);
  await assert.rejects(search, failedAs("exited"));
  // The second helper has not said it is ready: nothing is warming, so its requests time out as usual.
  await assert.rejects(service.search({ q: "zebra", code: false, meaning: false }), failedAs("timeout"));
});

test("when the helper can't be started at all, the reason is kept for the error log", () => {
  let failure: string | undefined;
  const { children } = started({ onFailed: (log) => (failure = log) });
  children[0].fail(new Error("spawn /Applications/DigUp.app/Contents/Helpers/digup EACCES"));
  assert.equal(children.length, 2);
  children[1].fail(new Error("spawn /Applications/DigUp.app/Contents/Helpers/digup EACCES"));
  assert.match(failure ?? "", /EACCES/);
});

test("the extension is told when a replacement helper is started, even one for a helper that never got ready", () => {
  let restarts = 0;
  const { service, children } = started({ onRestart: () => (restarts += 1) });
  children[0].exit(1); // before it ever said it was ready
  assert.equal(children.length, 2);
  assert.equal(restarts, 1);
  service.stop();
  children[1].exit(0); // stopped on purpose: not a restart
  assert.equal(restarts, 1);
});
