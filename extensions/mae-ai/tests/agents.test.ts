import assert from "node:assert/strict";
import { createServer, Server, ServerResponse } from "node:http";
import { createRequire } from "node:module";
import { createPublicKey, verify } from "node:crypto";
import { once } from "node:events";
import test from "node:test";
import { buildDeviceAuthPayloadV3 } from "@openclaw/gateway-client";
import {
  deviceHost,
  openDeviceData,
  sealDeviceData,
} from "../src/lib/agents/device-vault";
import {
  HermesAdapter,
  hermesApprovals,
  hermesState,
} from "../src/lib/agents/hermes";
import { readAgentEvents } from "../src/lib/agents/http";
import { OpenClawAdapter, openClawApproval } from "../src/lib/agents/openclaw";
import {
  AgentEvent,
  AgentSession,
  agentScope,
  historyMessages,
  normalizeAgentUrl,
  record,
  safeAgentError,
  string,
} from "../src/lib/agents/types";

async function listen(server: Server) {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  return `http://127.0.0.1:${address.port}`;
}

async function close(server: Server) {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
}

function json(response: ServerResponse, value: unknown, status = 200) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(value));
}

const signal = () => AbortSignal.timeout(8000);

test("agent URLs preserve profile/proxy prefixes, reject embedded secrets, and scope sessions to credentials", () => {
  assert.equal(
    normalizeAgentUrl("hermes", "https://agent.example/p/research/v1"),
    "https://agent.example/p/research",
  );
  assert.equal(
    normalizeAgentUrl("openclaw", "https://agent.example/gateway/"),
    "wss://agent.example/gateway",
  );
  for (const value of [
    "https://key@agent.example",
    "https://agent.example?key=secret",
    "file:///C:/test",
    "https://agent.example/#secret",
  ]) {
    assert.throws(() => normalizeAgentUrl("hermes", value));
  }
  const config = {
    backend: "hermes" as const,
    url: "http://127.0.0.1:8642",
    secret: "first",
  };
  assert.notEqual(
    agentScope(config),
    agentScope({ ...config, secret: "second" }),
  );
  assert.notEqual(
    agentScope(config),
    agentScope({ ...config, backend: "openclaw" }),
  );
  assert.equal(
    safeAgentError(new Error("invalid first"), config.secret),
    "invalid [redacted]",
  );
});

test("history projection excludes tool results and private reasoning", () => {
  assert.deepEqual(
    historyMessages([
      { role: "user", content: "Hi" },
      {
        role: "assistant",
        content: [
          { type: "thinking", text: "private" },
          { type: "text", text: "Hello" },
        ],
      },
      { role: "tool", content: "raw result" },
    ]),
    [
      { role: "user", text: "Hi" },
      { role: "assistant", text: "Hello" },
    ],
  );
  assert.equal(hermesState("unknown"), "unknown");
  assert.equal(hermesState("interrupted"), "failed");
});

test("device vault is authenticated encryption, persists stable identity, and never stores plaintext tokens", async () => {
  const values = new Map<string, string>();
  const store = {
    read: async (key: string) => values.get(key),
    write: async (key: string, value: string) => {
      values.set(key, value);
    },
  };
  const host = await deviceHost(store, "scope", "gateway-secret");
  const identity = host.deps.loadOrCreateDeviceIdentity!()!;
  host.deps.storeDeviceAuthToken!({
    deviceId: identity.deviceId,
    role: "operator",
    token: "issued-secret",
    scopes: ["operator.read"],
  });
  await host.flush();
  const encoded = [...values.values()][0];
  assert.ok(
    !encoded.includes("PRIVATE KEY") &&
      !encoded.includes("issued-secret") &&
      !encoded.includes("gateway-secret"),
  );
  const restored = await deviceHost(store, "scope", "gateway-secret");
  assert.equal(
    restored.deps.loadOrCreateDeviceIdentity!()!.deviceId,
    identity.deviceId,
  );
  assert.equal(
    restored.deps.loadDeviceAuthToken!({
      deviceId: identity.deviceId,
      role: "operator",
    })!.token,
    "issued-secret",
  );
  assert.throws(() => openDeviceData(encoded, "wrong-secret"));
  const envelope = JSON.parse(sealDeviceData({ test: true }, "key"));
  envelope.tag = Buffer.alloc(16).toString("base64");
  assert.throws(() => openDeviceData(JSON.stringify(envelope), "key"));
});

test("native SSE reader handles byte-split Unicode, CRLF, event IDs, and comments", async () => {
  const events: unknown[] = [];
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const byte of new TextEncoder().encode(
        ': keepalive\r\n\r\nid: 4\r\nevent: message.delta\r\ndata: {"delta":"你好"}\r\n\r\n',
      )) {
        controller.enqueue(Uint8Array.of(byte));
      }
      controller.close();
    },
  });
  await readAgentEvents(body, (event) => events.push(event), signal());
  assert.deepEqual(events, [
    { id: "4", event: "message.delta", data: { delta: "你好" } },
  ]);
});

test("Hermes resumes the same run with Last-Event-ID and deduplicates replay without redispatch", async () => {
  let submissions = 0;
  let streams = 0;
  let complete = false;
  let sessionId = "";
  const receivedIds: string[] = [];
  const server = createServer(async (request, response) => {
    assert.equal(request.headers.authorization, "Bearer hermes-test-key");
    const path = request.url!;
    if (path === "/p/research/v1/capabilities")
      return json(response, {
        features: {
          run_submission: true,
          run_status: true,
          run_events_sse: true,
          run_stop: true,
          run_approval: true,
        },
      });
    if (path === "/p/research/v1/models")
      return json(response, { data: [{ id: "research" }] });
    if (path === "/p/research/api/sessions" && request.method === "POST") {
      let raw = "";
      for await (const part of request) raw += part;
      sessionId = JSON.parse(raw).id;
      return json(response, { id: sessionId });
    }
    if (path === "/p/research/v1/runs" && request.method === "POST") {
      submissions++;
      let raw = "";
      for await (const part of request) raw += part;
      const body = JSON.parse(raw);
      assert.equal(body.session_id, sessionId);
      assert.equal(body.input, "Hello");
      assert.equal(body.instructions, "Be concise.");
      assert.equal(body.model, undefined);
      assert.equal(request.headers["idempotency-key"], "submission-1");
      return json(response, { run_id: "run-1", status: "started" }, 202);
    }
    if (path.startsWith(`/p/research/api/sessions/${sessionId}/messages`))
      return json(response, {
        session_id: sessionId,
        data: [{ role: "user", content: "Hello" }],
      });
    if (path === "/p/research/v1/runs/run-1")
      return json(response, {
        run_id: "run-1",
        session_id: sessionId,
        status: complete ? "completed" : "running",
        output: complete ? "Hello" : "",
      });
    if (path === "/p/research/v1/runs/run-1/events") {
      streams++;
      receivedIds.push(string(request.headers["last-event-id"]));
      response.writeHead(200, { "Content-Type": "text/event-stream" });
      if (streams === 1)
        return response.end(
          'id: 0\ndata: {"run_id":"run-1","event":"message.delta","delta":"Hel","seq":0}\n\n',
        );
      complete = true;
      return response.end(
        [
          'id: 0\ndata: {"run_id":"run-1","event":"message.delta","delta":"Hel","seq":0}\n\n',
          'id: 1\ndata: {"run_id":"run-1","event":"tool.started","tool":"web_search","seq":1}\n\n',
          'id: 2\ndata: {"run_id":"run-1","event":"message.delta","delta":"lo","seq":2}\n\n',
          'id: 3\ndata: {"run_id":"run-1","event":"run.completed","output":"Hello","seq":3}\n\n',
        ].join(""),
      );
    }
    json(response, {}, 404);
  });
  const url = await listen(server);
  const adapter = new HermesAdapter({
    backend: "hermes",
    url: `${url}/p/research`,
    secret: "hermes-test-key",
  });
  try {
    assert.deepEqual(await adapter.targets(signal()), [
      { id: "research", title: "research" },
    ]);
    const created = await adapter.create("research");
    const session = await adapter.send(
      created,
      "Hello",
      "Be concise.",
      "submission-1",
    );
    const events: AgentEvent[] = [];
    await adapter.restore(session, (event) => events.push(event));
    await adapter.watch(session, (event) => events.push(event), signal());
    assert.equal(submissions, 1);
    assert.deepEqual(receivedIds, ["", "0"]);
    assert.ok(
      events.some((event) => event.type === "text" && event.text === "Hel"),
    );
    assert.ok(
      events.some(
        (event) =>
          event.type === "progress" && event.text.includes("web_search"),
      ),
    );
    assert.equal(
      events.filter((event) => event.type === "text").at(-1)?.type === "text" &&
        record(events.filter((event) => event.type === "text").at(-1)).text,
      "Hello",
    );
    assert.ok(
      !events.some(
        (event) => event.type === "text" && event.text.includes("HelHel"),
      ),
    );
    assert.ok(
      events.some(
        (event) => event.type === "state" && event.state === "completed",
      ),
    );
  } finally {
    await adapter.close();
    await close(server);
  }
});

test("Hermes controls carry exact approval identity and stopping remains cooperative", async () => {
  const bodies: Record<string, unknown>[] = [];
  let stopped = false;
  const server = createServer(async (request, response) => {
    if (request.method === "POST") {
      let raw = "";
      for await (const part of request) raw += part;
      bodies.push(JSON.parse(raw));
      if (request.url?.endsWith("/stop")) stopped = true;
      return json(response, { status: "stopping" });
    }
    if (request.url?.endsWith("/events")) {
      response.writeHead(200, { "Content-Type": "text/event-stream" });
      return response.end('data: {"event":"run.cancelled","run_id":"r"}\n\n');
    }
    return json(response, { status: stopped ? "cancelled" : "running" });
  });
  const url = await listen(server);
  const adapter = new HermesAdapter({
    backend: "hermes",
    url,
    secret: "agent-only",
  });
  const session: AgentSession = { id: "s", target: "hermes-agent", runId: "r" };
  try {
    const approvals = hermesApprovals(
      [
        {
          kind: "approval",
          prompt_id: "prompt-9",
          execution_generation: 7,
          command: "echo test",
        },
      ],
      1,
    );
    assert.equal(approvals.length, 1);
    await adapter.approve(session, approvals[0], true);
    await adapter.approve(session, approvals[0], false);
    assert.deepEqual(bodies, [
      { request_id: "prompt-9", execution_generation: 7, choice: "once" },
      { request_id: "prompt-9", execution_generation: 7, choice: "deny" },
    ]);
    assert.deepEqual(
      hermesApprovals([{ kind: "approval", prompt_id: "unsafe" }], undefined),
      [],
    );
    await adapter.stop(session);
    const events: AgentEvent[] = [];
    await adapter.watch(session, (event) => events.push(event), signal());
    assert.ok(
      events.some(
        (event) => event.type === "state" && event.state === "cancelled",
      ),
    );
    assert.ok(
      !events.some(
        (event) => event.type === "state" && event.state === "completed",
      ),
    );
  } finally {
    await close(server);
  }
});

interface TestSocket {
  send(value: string): void;
  on(event: "message", handler: (data: Buffer) => void): void;
  close(code?: number): void;
  terminate(): void;
}

test("OpenClaw uses signed protocol-v4 pairing, isolated sessions, streaming, approvals, and remote abort", async () => {
  const { WebSocketServer } = createRequire(__filename)("ws");
  const http = createServer();
  const wss = new WebSocketServer({ server: http });
  let socket: TestSocket;
  let sessionKey = "";
  let runId = "";
  let currentText = "";
  let running = false;
  let sends = 0;
  let aborted = false;
  let generation = 0;
  let connections = 0;
  let historyReads = 0;
  const decisions: unknown[] = [];
  const methods = [
    "agents.list",
    "sessions.create",
    "sessions.subscribe",
    "sessions.messages.subscribe",
    "chat.history",
    "chat.send",
    "chat.abort",
    "approval.resolve",
  ];
  const approval = {
    id: "approval-1",
    status: "pending",
    createdAtMs: Date.now(),
    expiresAtMs: Date.now() + 60_000,
    urlPath: "/approvals/approval-1",
    presentation: {
      kind: "exec",
      commandText: "echo test",
      allowedDecisions: ["allow-once", "deny"],
    },
  };
  function event(name: string, payload: unknown) {
    socket.send(
      JSON.stringify({
        type: "event",
        event: name,
        payload,
        seq: ++generation,
      }),
    );
  }
  wss.on("connection", (peer: TestSocket) => {
    connections++;
    socket = peer;
    generation = 0;
    const timestamp = Date.now();
    event("connect.challenge", { nonce: "test-nonce", ts: timestamp });
    peer.on("message", (data) => {
      const request = JSON.parse(data.toString());
      const params = request.params;
      let result: unknown = {};
      if (request.method === "connect") {
        assert.equal(params.minProtocol, 4);
        assert.equal(params.maxProtocol, 4);
        assert.equal(params.client.displayName, "Pocket AI");
        assert.equal(params.client.id, "webchat");
        assert.equal(params.auth.token, "openclaw-only");
        assert.deepEqual(params.scopes, [
          "operator.read",
          "operator.write",
          "operator.approvals",
        ]);
        assert.equal(params.device.nonce, "test-nonce");
        assert.equal(params.device.signedAt, timestamp);
        const key = createPublicKey({
          key: { kty: "OKP", crv: "Ed25519", x: params.device.publicKey },
          format: "jwk",
        });
        const payload = buildDeviceAuthPayloadV3({
          deviceId: params.device.id,
          clientId: params.client.id,
          clientMode: params.client.mode,
          role: params.role,
          scopes: params.scopes,
          signedAtMs: params.device.signedAt,
          token: params.auth.token,
          nonce: params.device.nonce,
          platform: params.client.platform,
          deviceFamily: params.client.deviceFamily,
        });
        assert.ok(
          verify(
            null,
            Buffer.from(payload),
            key,
            Buffer.from(params.device.signature, "base64url"),
          ),
        );
        result = {
          type: "hello-ok",
          protocol: 4,
          server: { version: "test", connId: "test-connection" },
          features: { methods, events: ["chat", "agent", "session.approval"] },
          snapshot: {},
          policy: {
            maxPayload: 1048576,
            maxBufferedBytes: 1048576,
            tickIntervalMs: 30000,
          },
          auth: {
            role: "operator",
            scopes: params.scopes,
            deviceToken: "issued-device-secret",
          },
        };
      } else if (request.method === "agents.list")
        result = { agents: [{ id: "research", name: "Research Agent" }] };
      else if (request.method === "sessions.create") {
        sessionKey = params.key;
        assert.ok(sessionKey.startsWith("agent:research:pocket-ai:"));
        result = { ok: true, key: sessionKey, sessionId: "physical-1" };
      } else if (request.method === "sessions.messages.subscribe") {
        assert.equal(params.key, sessionKey);
        assert.equal(params.includeApprovals, true);
        result = {
          subscribed: true,
          key: sessionKey,
          approvalReplay: {
            approvals: running ? [approval] : [],
            truncated: false,
          },
        };
      } else if (request.method === "chat.send") {
        sends++;
        runId = params.idempotencyKey;
        running = true;
        assert.equal(params.sessionId, "physical-1");
        assert.equal(params.deliver, false);
        assert.match(params.message, /Be concise/);
        result = { runId, status: "started" };
      } else if (request.method === "chat.history") {
        historyReads++;
        result = {
          sessionId: "physical-1",
          messages: running ? [{ role: "user", content: "Hello" }] : [],
          ...(running ? { inFlightRun: { runId, text: currentText } } : {}),
        };
      } else if (request.method === "approval.resolve") {
        decisions.push(params);
        event("session.approval", {
          sessionKey,
          phase: "terminal",
          approval: { ...approval, status: "denied" },
        });
      } else if (request.method === "chat.abort") {
        assert.equal(params.runId, runId);
        aborted = true;
        running = false;
        event("chat", {
          sessionKey,
          runId,
          state: "aborted",
          seq: 4,
          message: { role: "assistant", content: "Hello" },
        });
      }
      peer.send(
        JSON.stringify({
          type: "res",
          id: request.id,
          ok: true,
          payload: result,
        }),
      );
    });
  });
  const url = (await listen(http)).replace("http:", "ws:");
  const stored = new Map<string, string>();
  const host = await deviceHost(
    {
      read: async (key) => stored.get(key),
      write: async (key, value) => {
        stored.set(key, value);
      },
    },
    "test",
    "openclaw-only",
  );
  const adapter = new OpenClawAdapter(
    { backend: "openclaw", url, secret: "openclaw-only" },
    host.deps,
    host.flush,
  );
  const events: AgentEvent[] = [];
  try {
    assert.deepEqual(await adapter.targets(signal()), [
      { id: "research", title: "Research Agent" },
    ]);
    const created = await adapter.create("research");
    const accepted = await adapter.send(
      created,
      "Hello",
      "Be concise",
      "request-one",
    );
    let active!: AgentSession;
    active = await adapter.restore(accepted, (value) => events.push(value));
    const watch = adapter.watch(
      active,
      (value) => events.push(value),
      signal(),
    );
    await new Promise((resolve) => setTimeout(resolve, 150));
    currentText = "Hel";
    event("chat", {
      sessionKey,
      runId,
      state: "delta",
      seq: 1,
      deltaText: "Hel",
      replace: true,
    });
    event("chat", {
      sessionKey,
      runId,
      state: "delta",
      seq: 1,
      deltaText: "Hel",
    });
    event("agent", {
      runId,
      seq: 1,
      stream: "tool",
      ts: Date.now(),
      data: { phase: "start", name: "web_search" },
    });
    currentText = "Hello";
    event("chat", {
      sessionKey,
      runId,
      state: "delta",
      seq: 2,
      deltaText: "lo",
    });
    event("chat", {
      sessionKey: "foreign",
      runId: "foreign-run",
      state: "delta",
      seq: 3,
      deltaText: "LEAK",
    });
    event("session.approval", {
      sessionKey: "foreign",
      phase: "pending",
      approval: { ...approval, id: "foreign-approval" },
    });
    await new Promise((resolve) => setTimeout(resolve, 100));
    const previousReads = historyReads;
    socket!.close(1012);
    const deadline = Date.now() + 6000;
    while (
      (connections < 2 || historyReads <= previousReads) &&
      Date.now() < deadline
    ) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.ok(
      connections >= 2 && historyReads > previousReads,
      "reconnected and restored authoritative history",
    );
    event("chat", {
      sessionKey,
      runId,
      state: "delta",
      seq: 2,
      deltaText: "lo",
    });
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.ok(
      !events.some(
        (value) => value.type === "text" && value.text === "Hellolo",
      ),
      "per-run sequences survive connection replacement",
    );
    await adapter.approve(active, openClawApproval(approval)!, false);
    await adapter.stop(active);
    await watch;
    assert.equal(sends, 1);
    assert.equal(aborted, true);
    assert.deepEqual(decisions, [
      { id: "approval-1", kind: "exec", decision: "deny" },
    ]);
    assert.ok(
      events.some((value) => value.type === "text" && value.text === "Hello"),
    );
    assert.ok(
      !events.some(
        (value) => value.type === "text" && /HelHel|LEAK/.test(value.text),
      ),
    );
    assert.ok(
      events.some(
        (value) =>
          value.type === "progress" && value.text.includes("web_search"),
      ),
    );
    assert.ok(
      events.some(
        (value) => value.type === "state" && value.state === "cancelled",
      ),
    );
    await assert.rejects(
      adapter.restore(
        { ...created, sessionId: "replaced-session" },
        () => undefined,
      ),
      /replaced/,
    );
    const uncertain: AgentEvent[] = [];
    await adapter.restore(
      { ...created, pendingSubmission: "lost-ack" },
      (value) => uncertain.push(value),
    );
    assert.ok(
      uncertain.some(
        (value) => value.type === "state" && value.state === "unknown",
      ),
    );
    assert.equal(
      sends,
      1,
      "reconnect, replacement, and uncertain ACK do not redispatch",
    );
  } finally {
    await adapter.close();
    for (const client of wss.clients as Set<TestSocket>) client.terminate();
    await new Promise<void>((resolve) => wss.close(() => resolve()));
    await close(http);
  }
});

test("Hermes retries a transient status failure and settles on a terminal event without waiting for SSE EOF", async () => {
  let polls = 0;
  const server = createServer((request, response) => {
    if (request.url?.endsWith("/events")) {
      response.writeHead(200, { "Content-Type": "text/event-stream" });
      response.write(
        'data: {"event":"run.completed","run_id":"r","output":"Done."}\n\n',
      );
      return;
    }
    polls++;
    json(response, { status: "running" }, polls === 1 ? 503 : 200);
  });
  const url = await listen(server);
  const adapter = new HermesAdapter({ backend: "hermes", url, secret: "" });
  const events: AgentEvent[] = [];
  try {
    await adapter.watch(
      { id: "s", target: "agent", runId: "r" },
      (event) => events.push(event),
      signal(),
    );
    assert.ok(polls >= 2);
    assert.ok(
      events.some((event) => event.type === "text" && event.text === "Done."),
    );
    assert.equal(
      record(events.filter((event) => event.type === "state").at(-1)).state,
      "completed",
    );
  } finally {
    await close(server);
  }
});

test("Hermes failures and unknown executions never turn into successful or replayed requests", async () => {
  for (const status of ["failed", "unknown"]) {
    let posts = 0;
    const server = createServer((request, response) => {
      if (request.method === "POST") posts++;
      json(response, { status, error: "remote failure" });
    });

    const url = await listen(server);
    const adapter = new HermesAdapter({ backend: "hermes", url, secret: "" });
    const events: AgentEvent[] = [];
    try {
      await adapter.watch(
        { id: "s", target: "agent", runId: "r" },
        (event) => events.push(event),
        signal(),
      );
      assert.equal(posts, 0);
      assert.ok(
        events.some(
          (event) => event.type === "state" && event.state === status,
        ),
      );
      assert.ok(
        !events.some(
          (event) => event.type === "state" && event.state === "completed",
        ),
      );
    } finally {
      await close(server);
    }
  }
});
