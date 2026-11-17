import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { test, type TestContext } from "node:test";
import { GhosthandError } from "../src/lib/errors";
import { GhosthandClient, validateTypedText } from "../src/lib/ghosthand-client";
import { withLease } from "../src/lib/leases";
import { readEvents } from "../src/lib/sse";
import { TaskRun } from "../src/lib/task-run";
import { SocketTransport } from "../src/lib/transport";
import type { Phone, PhoneOverview } from "../src/lib/types";
import { canControl, deviceStatus, markdownText } from "../src/utils/device-status";
import { listAiPhones, readAiScreen, runAiTask, performAiAction } from "../src/lib/ai-operations";
import { confirmation as taskConfirmation } from "../src/tools/run-iphone-task";
import { confirmation as screenConfirmation } from "../src/tools/read-screen-text";
import { confirmation as actionConfirmation } from "../src/tools/iphone-quick-action";

const phone: Phone = {
  id: "usb-phone",
  captureId: "capture-device",
  name: "Test iPhone",
  step: "ready",
  control: "bluetooth",
  waiting: [],
};
const overview: PhoneOverview = {
  macName: "Test Mac",
  account: { state: "signed-in", server: "https://ghosthand.dev" },
  camera: "authorized",
  bluetooth: { state: "on" },
  phones: [phone],
};
const lease = {
  id: "studio:42",
  device: "capture-device",
  deviceName: "Test iPhone",
  reason: "Test",
  idleTimeoutSeconds: 600,
  expiresAt: "2026-11-05T13:10:00Z",
  notice: "Review the payment method on your Ghosthand account.",
};
const text = {
  width: 414,
  height: 896,
  lines: [
    { text: "Settings", x: 20, y: 96, width: 124, height: 34, confidence: 1 },
    { text: "General", x: 66, y: 433, width: 64, height: 20, confidence: 1 },
  ],
};
type Request = { method: string; path: string; body?: Record<string, unknown>; accept?: string };
type Handler = (request: Request, response: ServerResponse, incoming: IncomingMessage) => boolean | Promise<boolean>;

function json(response: ServerResponse, value: unknown, status = 200) {
  response.writeHead(status, { "Content-Type": status >= 400 ? "application/problem+json" : "application/json" });
  response.end(JSON.stringify(value));
}
function stream(response: ServerResponse, content: string) {
  response.writeHead(200, { "Content-Type": "text/event-stream", "Ghosthand-Task": "tsk_12345678" });
  response.end(content);
}

function holdStream({ pathSuffix, firstEvent }: { pathSuffix: string; firstEvent: string }) {
  const opened = Promise.withResolvers<void>();
  const closed = Promise.withResolvers<void>();

  function handle(request: Request, response: ServerResponse) {
    if (!request.path.endsWith(pathSuffix)) return false;
    response.writeHead(200, { "Content-Type": "text/event-stream" });
    response.once("close", () => closed.resolve());
    response.write(firstEvent);
    opened.resolve();
    return true;
  }

  return { handle, opened: opened.promise, closed: closed.promise };
}

function failLeaseRelease(request: Request, response: ServerResponse) {
  if (request.method !== "DELETE") return false;
  json(response, { code: "internal-error", detail: "Could not release", title: "Error", status: 500 }, 500);
  return true;
}

const event = (value: unknown) => `data: ${JSON.stringify(value)}\n\n`;
const complete =
  event({ type: "text-delta", id: "1", delta: "Done." }) +
  event({ type: "finish", finishReason: "stop" }) +
  "data: [DONE]\n\n";
const code = (expected: string) => (error: unknown) => error instanceof GhosthandError && error.code === expected;
const signal = () => new AbortController().signal;

async function daemon(t: TestContext, handler?: Handler) {
  const directory = await mkdtemp("/tmp/gh-test-");
  const socket = join(directory, "daemon.sock");
  const requests: Request[] = [];
  const server = createServer(async (incoming, response) => {
    try {
      const parts: Buffer[] = [];
      for await (const chunk of incoming) parts.push(Buffer.from(chunk));
      const body = Buffer.concat(parts).toString();
      const request = {
        method: incoming.method ?? "GET",
        path: incoming.url ?? "",
        body: body ? JSON.parse(body) : undefined,
        accept: incoming.headers.accept,
      };
      requests.push(request);
      if (await handler?.(request, response, incoming)) return;
      if (request.path === "/v1/phones") json(response, overview);
      else if (request.path === "/v1/leases") json(response, lease, 201);
      else if (request.method === "DELETE") json(response, { message: "released" });
      else if (request.path.endsWith("/text")) json(response, text);
      else if (request.path.endsWith("/task")) stream(response, complete);
      else if (request.path.includes("/preview")) {
        response.writeHead(200, { "Content-Type": "image/jpeg" });
        response.end(Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
      } else json(response, { message: "sent", logs: [] });
    } catch (error) {
      response.destroy(error instanceof Error ? error : new Error("Mock daemon failed"));
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(socket, resolve);
  });
  t.after(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  });
  return { client: new GhosthandClient(new SocketTransport(socket)), transport: new SocketTransport(socket), requests };
}

test("SSE framing preserves split UTF-8, CRLF, comments, and multiline data", async () => {
  const input = Buffer.from(
    ': ping\r\nevent: result\r\ndata: {"text":\r\ndata: "café 📱"}\r\n\r\ndata: [DONE]\r\n\r\n',
  );
  async function* bytes() {
    for (const byte of input) yield Buffer.from([byte]);
  }
  const events = [];
  for await (const item of readEvents(bytes())) events.push(item);
  assert.deepEqual(events, [
    { event: "result", data: '{"text":\n"café 📱"}' },
    { event: "message", data: "[DONE]" },
  ]);
});

test("an unframed final SSE event is not treated as complete", async () => {
  async function* source() {
    yield Buffer.from("data: [DONE]\n");
  }
  const events = [];
  for await (const item of readEvents(source())) events.push(item);
  assert.deepEqual(events, []);
});

test("busy and setup devices stay visible; readiness follows the daemon step", async (t) => {
  const busy = {
    ...phone,
    lease: {
      label: "Other agent",
      reason: "Testing",
      acquiredAt: "2026-11-05T13:00:00Z",
      lastUsedAt: "2026-11-05T13:00:00Z",
      expiresAt: "2026-11-05T13:10:00Z",
    },
  };
  const locked = { ...phone, id: "locked", step: "unlock" as const };
  const { client } = await daemon(t, (request, response) => {
    if (request.path !== "/v1/phones") return false;
    json(response, { ...overview, phones: [busy, locked] });
    return true;
  });
  const result = await client.phones();
  assert.equal(result.phones.length, 2);
  assert.equal(deviceStatus(result.phones[0]), "Busy");
  assert.equal(canControl(result.phones[0], result), false);
  assert.equal(canControl(result.phones[1], result), false);
  assert.equal(canControl(phone, overview), true);
  assert.equal(canControl(phone, { ...overview, account: { ...overview.account, state: "signed-out" } }), false);
});

test("preview uses the phone ID, encodes it, and never acquires a lease", async (t) => {
  const { client, requests } = await daemon(t);
  assert.ok((await client.preview("phone/id")).length);
  assert.deepEqual(
    requests.map((item) => item.path),
    ["/v1/phones/phone%2Fid/preview?width=600"],
  );
});

test("OCR uses the capture ID, preserves reading order, and releases control", async (t) => {
  const { client, requests } = await daemon(t);
  const result = await withLease(client, phone, "Read screen", signal(), (lease) => client.text(lease.id));
  assert.deepEqual(
    result.lines.map((line) => line.text),
    ["Settings", "General"],
  );
  assert.equal(requests[0].body?.device, phone.captureId);
  assert.equal(requests[0].body?.force, false);
  assert.equal(requests[0].body?.label, "Raycast Ghosthand");
  assert.deepEqual(
    requests.map((item) => item.path),
    ["/v1/leases", "/v1/leases/studio%3A42/text", "/v1/leases/studio%3A42"],
  );
  assert.equal(requests.at(-1)?.method, "DELETE");
});

test("a task streams progress and text and runs only once per submission", async (t) => {
  const { client, requests } = await daemon(t, (request, response) => {
    if (!request.path.endsWith("/task")) return false;
    stream(response, event({ type: "tool-input-available", toolName: "tap" }) + complete);
    return true;
  });
  const run = new TaskRun(client, phone, "Open Settings", true);
  const states: string[] = [];
  run.subscribe(() => states.push(run.snapshot().progress));
  await Promise.all([run.start(), run.start()]);
  assert.equal(run.snapshot().status, "completed");
  assert.equal(run.snapshot().text, "Done.");
  assert.ok(states.includes("Running tap"));
  assert.equal(requests.filter((item) => item.path.endsWith("/task")).length, 1);
  assert.equal(requests.find((item) => item.path.endsWith("/task"))?.accept, "text/event-stream");
  assert.equal(requests.at(-1)?.method, "DELETE");
});

test("separate streamed text blocks remain readable around phone operations", async (t) => {
  const { client } = await daemon(t, (request, response) => {
    if (!request.path.endsWith("/task")) return false;
    stream(
      response,
      event({ type: "text-start", id: "1" }) +
        event({ type: "text-delta", id: "1", delta: "Checking " }) +
        event({ type: "text-delta", id: "1", delta: "the screen." }) +
        event({ type: "text-end", id: "1" }) +
        event({ type: "tool-input-available", toolName: "screenshot" }) +
        event({ type: "text-start", id: "empty" }) +
        event({ type: "text-end", id: "empty" }) +
        event({ type: "text-start", id: "2" }) +
        event({ type: "text-delta", id: "2", delta: "" }) +
        event({ type: "text-delta", id: "2", delta: "Home Screen confirmed." }) +
        event({ type: "finish", finishReason: "stop" }) +
        "data: [DONE]\n\n",
    );
    return true;
  });
  const run = new TaskRun(client, phone, "Confirm Home Screen", true);
  await run.start();
  assert.equal(run.snapshot().status, "completed");
  assert.equal(run.snapshot().text, "Checking the screen.\n\nHome Screen confirmed.");
});

test("task view effect replay does not cancel a user-submitted task", async (t) => {
  const { client } = await daemon(t);
  const run = new TaskRun(client, phone, "Open Settings", true);
  const detach = run.attachView();
  detach();
  const finalDetach = run.attachView();
  await Promise.resolve();
  assert.equal(run.snapshot().status, "running");
  await run.start();
  assert.equal(run.snapshot().status, "completed");
  finalDetach();
});

test("leaving the last task view requests cancellation", async (t) => {
  const { client, requests } = await daemon(t);
  const run = new TaskRun(client, phone, "Open Settings", true);
  const detach = run.attachView();
  detach();
  detach();
  await Promise.resolve();
  await run.start();
  assert.equal(run.snapshot().status, "stopped");
  assert.equal(requests.length, 0);
});

for (const streaming of [true, false]) {
  test(`JSON task result works with ${streaming ? "server fallback" : "explicit JSON mode"} without re-posting`, async (t) => {
    const { client, requests } = await daemon(t, (request, response) => {
      if (!request.path.endsWith("/task")) return false;
      json(response, { task: "tsk_12345678", text: "Finished" });
      return true;
    });
    const run = new TaskRun(client, phone, "Open Settings", streaming);
    await run.start();
    assert.equal(run.snapshot().status, "completed");
    assert.equal(run.snapshot().text, "Finished");
    const posts = requests.filter((item) => item.path.endsWith("/task"));
    assert.equal(posts.length, 1);
    assert.equal(posts[0].accept, streaming ? "text/event-stream" : "application/json");
  });
}

for (const [name, content] of [
  ["streamed error", event({ type: "error", errorText: "Agent failed" }) + "data: [DONE]\n\n"],
  ["missing finish", "data: [DONE]\n\n"],
  ["truncated stream", event({ type: "text-delta", delta: "Partial" })],
  ["missing DONE", event({ type: "finish" })],
  ["invalid JSON", "data: {broken}\n\n"],
  ["token limit", event({ type: "finish", finishReason: "length" }) + "data: [DONE]\n\n"],
]) {
  test(`${name} never reports successful task completion and releases the lease`, async (t) => {
    const { client, requests } = await daemon(t, (request, response) => {
      if (!request.path.endsWith("/task")) return false;
      stream(response, content);
      return true;
    });
    const run = new TaskRun(client, phone, "Open Settings", true);
    await run.start();
    assert.equal(run.snapshot().status, "failed");
    assert.ok(run.snapshot().error);
    assert.equal(requests.at(-1)?.method, "DELETE");
    assert.equal(requests.filter((item) => item.path.endsWith("/task")).length, 1);
  });
}

test("task cancellation closes the stream and releases with an independent request", async (t) => {
  const taskStream = holdStream({ pathSuffix: "/task", firstEvent: event({ type: "start" }) });
  const { client, requests } = await daemon(t, taskStream.handle);
  const run = new TaskRun(client, phone, "Open Settings", true);
  const pending = run.start();
  await taskStream.opened;
  run.cancel();
  await pending;
  await taskStream.closed;
  assert.equal(run.snapshot().status, "stopped");
  assert.match(run.snapshot().error ?? "", /not undone/);
  assert.equal(requests.at(-1)?.method, "DELETE");
});

test("cancellation during acquisition drains the response and releases its new lease", async (t) => {
  const acquiring = Promise.withResolvers<ServerResponse>();
  const { client, requests } = await daemon(t, (request, response) => {
    if (request.path !== "/v1/leases") return false;
    acquiring.resolve(response);
    return true;
  });
  const run = new TaskRun(client, phone, "Open Settings", true);
  const pending = run.start();
  const response = await acquiring.promise;
  run.cancel();
  json(response, lease, 201);
  await pending;
  assert.equal(run.snapshot().status, "stopped");
  assert.deepEqual(
    requests.map((item) => item.method),
    ["POST", "DELETE"],
  );
});

test("a busy lease reports its holder and is never forcibly acquired or released", async (t) => {
  const { client, requests } = await daemon(t, (request, response) => {
    if (request.path !== "/v1/leases") return false;
    json(
      response,
      { code: "device-leased", title: "Busy", status: 409, detail: "Other agent is testing Settings" },
      409,
    );
    return true;
  });
  await assert.rejects(
    withLease(client, phone, "Test", signal(), async () => "never"),
    code("device-leased"),
  );
  assert.equal(requests.length, 1);
  assert.equal(requests[0].body?.force, false);
});

test("simultaneous control operations on the same phone are rejected locally", async (t) => {
  const entered = Promise.withResolvers<void>();
  const finish = Promise.withResolvers<void>();
  const { client, requests } = await daemon(t);
  const first = withLease(client, phone, "First", signal(), async () => {
    entered.resolve();
    await finish.promise;
  });
  await entered.promise;
  await assert.rejects(
    withLease(client, phone, "Second", signal(), async () => undefined),
    code("device-leased"),
  );
  finish.resolve();
  await first;
  assert.equal(requests.filter((item) => item.path === "/v1/leases").length, 1);
});

test("cleanup failure cannot turn a completed operation into reported success", async (t) => {
  const { client } = await daemon(t, failLeaseRelease);
  const run = new TaskRun(client, phone, "Open Settings", true);
  await run.start();
  assert.equal(run.snapshot().status, "failed");
  assert.match(run.snapshot().error ?? "", /Lease release could not be confirmed/);
});

test("an expired lease is treated as already released", async (t) => {
  const { client } = await daemon(t, (request, response) => {
    if (request.method !== "DELETE") return false;
    json(response, { code: "lease-invalid", detail: "Expired", title: "Expired", status: 403 }, 403);
    return true;
  });
  assert.equal(await withLease(client, phone, "Test", signal(), async () => "done"), "done");
});

test("cancellation does not hide a lease cleanup failure", async (t) => {
  const taskStream = holdStream({ pathSuffix: "/task", firstEvent: event({ type: "start" }) });
  const { client } = await daemon(
    t,
    (request, response) => failLeaseRelease(request, response) || taskStream.handle(request, response),
  );
  const run = new TaskRun(client, phone, "Open Settings", true);
  const pending = run.start();
  await taskStream.opened;
  run.cancel();
  await pending;
  assert.equal(run.snapshot().status, "failed");
  assert.match(run.snapshot().error ?? "", /Lease release could not be confirmed/);
});

test("cancelling quick input closes its SSE connection before lease cleanup", async (t) => {
  const inputStream = holdStream({
    pathSuffix: "/scroll",
    firstEvent: 'event: log\ndata: {"message":"Waiting for Bluetooth"}\n\n',
  });
  const { client, requests } = await daemon(t, inputStream.handle);
  const controller = new AbortController();
  const pending = withLease(client, phone, "Scroll", controller.signal, (lease) =>
    client.input(lease.id, { kind: "scroll", direction: "down" }, controller.signal),
  );
  const rejected = assert.rejects(pending, { name: "AbortError" });
  await inputStream.opened;
  controller.abort();
  await rejected;
  await inputStream.closed;
  assert.equal(requests.at(-1)?.method, "DELETE");
  assert.equal(requests.filter((request) => request.path.endsWith("/scroll")).length, 1);
});

test("input verification failure is not retried and still releases control", async (t) => {
  const { client, requests } = await daemon(t, (request, response) => {
    if (!request.path.endsWith("/tap")) return false;
    stream(
      response,
      'event: error\ndata: {"code":"wait-text-timeout","detail":"Input was sent","status":504,"title":"Timed out"}\n\n',
    );
    return true;
  });
  await assert.rejects(
    withLease(client, phone, "Tap", signal(), (lease) => client.input(lease.id, { kind: "tap", text: "General" })),
    code("wait-text-timeout"),
  );
  assert.equal(requests.filter((item) => item.path.endsWith("/tap")).length, 1);
  assert.equal(requests.at(-1)?.method, "DELETE");
});

test("quick actions send the documented bodies and keep Enter separate", async (t) => {
  const { client, requests } = await daemon(t);
  await client.input(lease.id, { kind: "type", text: "Hello" });
  await client.input(lease.id, { kind: "home" });
  await client.input(lease.id, { kind: "enter" });
  await client.input(lease.id, { kind: "scroll", direction: "down" });
  await client.input(lease.id, { kind: "mute", muted: false });
  await client.input(lease.id, { kind: "lock" });
  assert.deepEqual(
    requests.map((item) => [item.path.split("/").at(-1), item.body]),
    [
      ["type", { text: "Hello", enter: false }],
      ["key", { key: "home" }],
      ["key", { key: "enter" }],
      ["scroll", { direction: "down", ticks: 5 }],
      ["mute", { muted: false }],
      ["lock", undefined],
    ],
  );
});

test("typing rejects newlines, tabs, control characters, and Unicode before sending", async (t) => {
  const { client, requests } = await daemon(t);
  for (const invalid of ["", "send\n", "send\r", "focus\t", "\u001b", "café", "hello 📱", "\u007f"]) {
    assert.ok(validateTypedText(invalid));
    await assert.rejects(client.input(lease.id, { kind: "type", text: invalid }), code("invalid-request"));
  }
  assert.equal(validateTypedText("Hello, Raycast! 123"), undefined);
  assert.equal(requests.length, 0);
});

test("remote and missing-capture phones cannot accidentally acquire a default device", async (t) => {
  const { client, requests } = await daemon(t);
  await assert.rejects(
    withLease(client, { ...phone, mac: "remote" }, "Test", signal(), async () => true),
    code("invalid-request"),
  );
  await assert.rejects(
    withLease(client, { ...phone, captureId: undefined }, "Test", signal(), async () => true),
    code("no-device"),
  );
  assert.equal(requests.length, 0);
});

test("malformed successful JSON fails safely and releases OCR's lease", async (t) => {
  const { client, requests } = await daemon(t, (request, response) => {
    if (!request.path.endsWith("/text")) return false;
    json(response, { lines: null });
    return true;
  });
  await assert.rejects(
    withLease(client, phone, "Read", signal(), (lease) => client.text(lease.id)),
    code("invalid-response"),
  );
  assert.equal(requests.at(-1)?.method, "DELETE");
});

test("an unavailable daemon produces an actionable local connection error", async () => {
  const client = new GhosthandClient(new SocketTransport("/tmp/ghosthand-no-such-socket.sock"));
  await assert.rejects(client.phones(), code("daemon-unreachable"));
});

test("requests have a deadline even when no headers arrive", async (t) => {
  const { transport } = await daemon(t, () => true);
  await assert.rejects(transport.json("/v1/phones", { timeoutMs: 25 }), code("request-timeout"));
});

test("untrusted task and OCR text cannot embed remote markdown images", () => {
  assert.equal(markdownText("![private](https://evil.test/image)"), "\\!\\[private\\](https://evil\\.test/image)");
});

test("AI device discovery returns cloneable selected fields without account or phone-number data", async (t) => {
  const { client } = await daemon(t, (request, response) => {
    if (request.path !== "/v1/phones") return false;
    json(response, {
      ...overview,
      account: { ...overview.account, email: "private@example.test" },
      phones: [{ ...phone, phoneNumber: "+123456789" }],
    });
    return true;
  });
  const result = await listAiPhones(client);
  assert.deepEqual(structuredClone(result), result);
  assert.equal(result.phones[0].phoneId, phone.id);
  assert.equal(result.phones[0].canControl, true);
  assert.doesNotMatch(JSON.stringify(result), /phoneNumber|private@example|captureId|capture-device/);
});

test("AI screen reading marks content untrusted and releases the lease before returning", async (t) => {
  const { client, requests } = await daemon(t);
  const result = await readAiScreen(client, phone.id);
  assert.deepEqual(structuredClone(result), result);
  assert.equal(result.status, "completed");
  if (result.status === "completed") {
    assert.equal(result.text, "Settings\nGeneral");
    assert.equal(result.contentIsUntrusted, true);
    assert.equal(result.notice, lease.notice);
  }
  assert.equal(requests.at(-1)?.method, "DELETE");
});

test("AI task results are cloneable and sent once through the hosted task endpoint", async (t) => {
  const { client, requests } = await daemon(t);
  const result = await runAiTask(client, phone.id, "Open Settings without changing settings");
  assert.equal(result.status, "completed");
  assert.equal(result.notice, lease.notice);
  assert.deepEqual(structuredClone(result), result);
  assert.equal(requests.filter((request) => request.path.endsWith("/task")).length, 1);
  assert.equal(requests.at(-1)?.method, "DELETE");
});

test("AI task failure returns an explicit uncertain outcome and forbids automatic retry", async (t) => {
  const { client, requests } = await daemon(t, (request, response) => {
    if (!request.path.endsWith("/task")) return false;
    stream(response, event({ type: "error", errorText: "Task failed after an input" }));
    return true;
  });
  const result = await runAiTask(client, phone.id, "Open Settings");
  assert.equal(result.status, "not-confirmed");
  if (result.status === "not-confirmed") {
    assert.equal(result.doNotRetryAutomatically, true);
    assert.equal(result.code, "task-failed");
    assert.equal(result.notice, lease.notice);
  }
  assert.deepEqual(structuredClone(result), result);
  assert.equal(requests.at(-1)?.method, "DELETE");
});

test("AI tools reject a stale phone ID instead of choosing another phone", async (t) => {
  const { client, requests } = await daemon(t);
  const result = await runAiTask(client, "unknown-phone", "Open Settings");
  assert.equal(result.status, "not-confirmed");
  assert.equal(result.notice, undefined);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].path, "/v1/phones");
});

test("AI tools refuse a busy phone before lease acquisition", async (t) => {
  const { client, requests } = await daemon(t, (request, response) => {
    if (request.path !== "/v1/phones") return false;
    json(response, {
      ...overview,
      phones: [{ ...phone, lease: { label: "QA", reason: "Testing", expiresAt: lease.expiresAt } }],
    });
    return true;
  });
  const result = await performAiAction(client, { phoneId: phone.id, action: "home" });
  assert.equal(result.status, "not-confirmed");
  if (result.status === "not-confirmed") assert.equal(result.code, "device-leased");
  assert.equal(requests.length, 1);
});

test("AI typing never submits, returns no typed content, and rejects control characters", async (t) => {
  const { client, requests } = await daemon(t);
  const invalid = await performAiAction(client, { phoneId: phone.id, action: "type-text", text: "Hello\n" });
  assert.equal(invalid.status, "not-confirmed");
  assert.equal(requests.length, 0);
  const result = await performAiAction(client, { phoneId: phone.id, action: "type-text", text: "Test input" });
  assert.equal(result.status, "completed");
  assert.equal(result.notice, lease.notice);
  assert.deepEqual(requests.find((request) => request.path.endsWith("/type"))?.body, {
    text: "Test input",
    enter: false,
  });
  assert.doesNotMatch(JSON.stringify(result), /Test input|logs/);
  assert.deepEqual(structuredClone(result), result);
});

test("AI confirmations disclose hosted execution, OCR sharing, and Enter side effects", async () => {
  const task = await taskConfirmation({ phoneId: phone.id, instruction: "Open Settings" });
  assert.match(task?.message ?? "", /hosted AI/);
  assert.equal(task?.info?.find((item) => item.name === "Instruction")?.value, "Open Settings");
  const screen = await screenConfirmation({ phoneId: phone.id });
  assert.match(screen?.message ?? "", /share it with Raycast AI/);
  const action = await actionConfirmation({ phoneId: phone.id, action: "press-enter" });
  assert.match(action?.message ?? "", /send a message/);
  assert.deepEqual(structuredClone({ task, screen, action }), { task, screen, action });
});
