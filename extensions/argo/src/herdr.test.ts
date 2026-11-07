import assert from "node:assert/strict";
import { once } from "node:events";
import { chmod, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { createServer, type Socket } from "node:net";
import { homedir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  HcClient,
  HcError,
  hcEntries,
  hcProgramFingerprint,
  hcTargetKey,
  resolveHcExecutable,
  resolveHcSocket,
  type HcCatalogue,
  type HcTarget,
  type HcTerminal,
} from "./herdr.js";

type Request = { jsonrpc: string; id: number; method: string; params: Record<string, unknown> };
const methods = [
  "hello",
  "terminal.list",
  "terminal.get",
  "terminal.read",
  "terminal.send",
  "terminal.keys",
  "terminal.interrupt",
  "machine.list",
  "events.subscribe",
];
const core = { id: "host-core", name: "my-mac" };
const hello = {
  generation: 1,
  framed: false,
  core,
  methods,
  features: ["events", "status", "future"],
  version: "0.1.17",
  extra: true,
};
const item: HcTerminal = {
  address: "t1",
  labels: { project: "测试" },
  argv: ["agent"],
  cwd: "/project",
  state: "live",
  created_ms: 1,
  status: { state: "blocked", kind: "question", msg: "继续?" },
  pid: 42,
};
const remote = { id: "remote-core", name: "box", state: "connected", extra: true };
const errorKind = (kind: string) => (error: unknown) => error instanceof HcError && error.kind === kind;
function reply(socket: Socket, id: number, result: unknown) {
  socket.write(JSON.stringify({ jsonrpc: "2.0", id, result }) + "\n");
}
function notification(socket: Socket, method: string, params: object) {
  socket.write(JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n");
}
async function fixture(handle?: (request: Request, socket: Socket, connection: number) => boolean | void) {
  const directory = await mkdtemp("/tmp/argo-hc-");
  const path = join(directory, "core.sock");
  const sockets = new Set<Socket>();
  const requests: Request[] = [];
  let connections = 0;
  const server = createServer((socket) => {
    const connection = ++connections;
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    socket.on("error", () => {});
    socket.setEncoding("utf8");
    let buffer = "";
    socket.on("data", (chunk) => {
      buffer += chunk;
      let newline: number;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const request = JSON.parse(buffer.slice(0, newline)) as Request;
        buffer = buffer.slice(newline + 1);
        requests.push(request);
        if (handle?.(request, socket, connection)) continue;
        const value =
          request.method === "hello"
            ? hello
            : request.method === "terminal.list"
              ? { terminals: [item], machines: [remote], hidden_finished: 0 }
              : request.method === "machine.list"
                ? { machines: [remote] }
                : request.method === "terminal.get"
                  ? item
                  : request.method === "terminal.read"
                    ? { text: "终端\nHello", complete: true, how: "screen", why: null }
                    : request.method === "events.subscribe"
                      ? { seq: 10, terminals: [item] }
                      : request.method === "terminal.interrupt"
                        ? { outcome: "unknown", key: "esc" }
                        : { status: "blocked", turn: 1, started: null };
        reply(socket, request.id, value);
      }
    });
  });
  server.listen(path);
  await once(server, "listening");
  return {
    path,
    directory,
    sockets,
    requests,
    target: async (): Promise<HcTarget> => ({
      kind: "hc",
      socketPath: await realpath(path),
      hostCoreId: core.id,
      coreId: core.id,
      terminalId: "t1",
    }),
    async close() {
      for (const socket of sockets) socket.destroy();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await rm(directory, { recursive: true, force: true });
    },
  };
}
async function env(values: Record<string, string | undefined>, run: () => Promise<void>) {
  const before = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  try {
    for (const [key, value] of Object.entries(values))
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    await run();
  } finally {
    for (const [key, value] of Object.entries(before))
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
  }
}

test("socket discovery follows overrides and HC environment without executing hc", async () => {
  const directory = await mkdtemp("/tmp/argo-hc-path-");
  try {
    const marker = join(directory, "was-executed");
    const executable = join(directory, "hc");
    await writeFile(executable, `#!/bin/sh\ntouch '${marker}'\n`, { mode: 0o700 });
    await env(
      {
        PATH: directory,
        HC_SOCKET: "/explicit env/core.sock",
        HC_SESSION: "demo",
        XDG_RUNTIME_DIR: directory,
        XDG_STATE_HOME: undefined,
      },
      async () => {
        assert.equal(await resolveHcExecutable(), executable);
        assert.equal(await resolveHcSocket("~/custom socket"), join(homedir(), "custom socket"));
        assert.equal(await resolveHcSocket(), "/explicit env/core.sock");
        delete process.env.HC_SOCKET;
        assert.equal(await resolveHcSocket(), join(directory, "herdr-core", "demo.sock"));
        delete process.env.XDG_RUNTIME_DIR;
        process.env.XDG_STATE_HOME = directory;
        const run = `/run/user/${process.getuid!()}`;
        const hasRun = await import("node:fs/promises").then(({ stat }) =>
          stat(run).then(
            (s) => s.isDirectory(),
            () => false,
          ),
        );
        assert.equal(
          await resolveHcSocket(),
          hasRun ? join(run, "herdr-core", "demo.sock") : join(directory, "herdr-core", "demo", "demo.sock"),
        );
        await assert.rejects(resolveHcSocket("relative.sock"), errorKind("config"));
        process.env.HC_SESSION = "../other";
        await assert.rejects(resolveHcSocket(), errorKind("config"));
        await assert.rejects(readFile(marker), { code: "ENOENT" });
      },
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("socket validation rejects absent, non-socket and public real parents; supports symlink and spaces", async () => {
  const f = await fixture();
  let client: HcClient | undefined;
  try {
    await assert.rejects(HcClient.connect(join(f.directory, "absent")), errorKind("missing"));
    const file = join(f.directory, "file");
    await writeFile(file, "not a socket");
    await assert.rejects(HcClient.connect(file), errorKind("permissions"));
    const link = join(f.directory, "socket with spaces");
    await symlink(f.path, link);
    client = await HcClient.connect(link);
    assert.equal(client.socketPath, await realpath(f.path));
    client.close();
    await chmod(f.directory, 0o755);
    await assert.rejects(HcClient.connect(link), errorKind("permissions"));
    await chmod(f.directory, 0o700);
    assert.equal(f.requests.filter((r) => r.method === "hello").length, 1);
  } finally {
    client?.close();
    await f.close();
  }
});

test("handshake validates generation, methods and features but permits extras", async () => {
  for (const patch of [
    { generation: 2 },
    { methods: ["terminal.list"] },
    { features: [] },
    { framed: true },
    { core: { id: "bad/id", name: "host" } },
  ]) {
    const f = await fixture((request, socket) => {
      if (request.method === "hello") {
        reply(socket, request.id, { ...hello, ...patch });
        return true;
      }
    });
    try {
      await assert.rejects(
        HcClient.connect(f.path),
        (error: unknown) => error instanceof HcError && ["incompatible", "protocol"].includes(error.kind),
      );
    } finally {
      await f.close();
    }
  }
});

test("fragmented UTF-8 and combined NDJSON replies dispatch by request ID", async () => {
  const waiting: { request: Request; socket: Socket }[] = [];
  const f = await fixture((request, socket) => {
    if (request.method === "hello") {
      const bytes = Buffer.from(
        JSON.stringify({ jsonrpc: "2.0", id: request.id, result: { ...hello, core: { ...core, name: "机器" } } }) +
          "\n",
      );
      for (const byte of bytes) socket.write(Buffer.from([byte]));
      return true;
    }
    if (request.method === "terminal.read") {
      waiting.push({ request, socket });
      if (waiting.length === 2)
        socket.write(
          waiting
            .toReversed()
            .map(({ request }) =>
              JSON.stringify({
                jsonrpc: "2.0",
                id: request.id,
                result: { text: String(request.params.lines), complete: true, how: "screen" },
              }),
            )
            .join("\r\n") + "\r\n",
        );
      return true;
    }
  });
  const client = await HcClient.connect(f.path);
  try {
    assert.equal(client.core.name, "机器");
    const target = await f.target();
    assert.deepEqual(
      (await Promise.all([client.read(target, 0), client.read(target, 2)])).map((x) => x.text),
      ["0", "2"],
    );
    assert.equal((await client.catalogue()).terminals[0]?.status?.kind, "question");
  } finally {
    client.close();
    await f.close();
  }
});

test("malformed, wrong-ID, truncated and oversized responses never expose payloads", async () => {
  for (const malformed of [
    (id: number) => `{"jsonrpc":"2.0","id":${id},"result":"SECRET"}\nnot-json SECRET\n`,
    () => "{SECRET\n",
    (id: number) => JSON.stringify({ jsonrpc: "2.0", id: id + 100, result: "SECRET" }) + "\n",
    () => "x".repeat(8 * 1024 * 1024 + 1),
    () => Buffer.from([0xff, 0x0a]),
    () => '{"SECRET":',
  ]) {
    const f = await fixture((request, socket) => {
      if (request.method === "terminal.read") {
        socket.end(malformed(request.id));
        return true;
      }
    });
    const client = await HcClient.connect(f.path);
    try {
      await assert.rejects(
        client.read(await f.target()),
        (error: unknown) => error instanceof HcError && error.kind === "protocol" && !error.message.includes("SECRET"),
      );
    } finally {
      client.close();
      await f.close();
    }
  }
});

test("catalogue maps only exact pinned local/remote addresses and separates equal terminal IDs", () => {
  const catalogue: HcCatalogue = {
    core,
    machines: [remote, { id: "down-core", name: "down", state: "needs_login" }],
    terminals: [
      item,
      { ...item, address: "box/t1" },
      { ...item, address: "remote-core/t2" },
      { ...item, address: "down/t1" },
      { ...item, address: "unregistered/t1" },
      { ...item, address: "box/friendly-name" },
      { ...item, address: "my-mac/t2" },
    ],
  };
  const entries = hcEntries(catalogue, "/socket");
  assert.deepEqual(
    entries.map((entry) => [entry.target.coreId, entry.target.terminalId, entry.connected]),
    [
      [core.id, "t1", true],
      [remote.id, "t1", true],
      [remote.id, "t2", true],
      ["down-core", "t1", false],
      [core.id, "t2", true],
    ],
  );
  assert.equal(new Set(entries.map((entry) => hcTargetKey(entry.target))).size, 5);
  assert.equal(
    hcEntries({ ...catalogue, machines: [remote, { id: "another", name: "box" }] }, "/socket").some(
      (entry) => entry.terminal.address === "box/t1",
    ),
    false,
  );
  assert.equal(
    hcEntries(
      { core, machines: [{ id: "imposter", name: core.name }], terminals: [{ ...item, address: `${core.name}/t1` }] },
      "/socket",
    ).length,
    0,
  );
});

test("get/read use owning core ID and reject changed host, path and remote route", async () => {
  let remoteOwner = remote.id;
  const f = await fixture((request, socket) => {
    if (request.method === "terminal.get") {
      reply(socket, request.id, {
        ...item,
        address: "box/t1",
        status: { state: "future-status" },
        unknown: { allowed: true },
      });
      return true;
    }
    if (request.method === "machine.list") {
      reply(socket, request.id, { machines: [{ ...remote, id: remoteOwner }] });
      return true;
    }
  });
  const client = await HcClient.connect(f.path);
  try {
    const target = { ...(await f.target()), coreId: remote.id };
    assert.equal((await client.get(target)).address, "box/t1");
    const capture = await client.read(target);
    assert.deepEqual(capture, { text: "终端\nHello", complete: true, how: "screen" });
    assert.ok(
      f.requests
        .filter((r) => ["terminal.get", "terminal.read"].includes(r.method))
        .every((r) => r.params.terminal === "remote-core/t1"),
    );
    const count = f.requests.length;
    await assert.rejects(client.get({ ...target, hostCoreId: "different" }), errorKind("changed"));
    await assert.rejects(client.get({ ...target, socketPath: "/different" }), errorKind("changed"));
    assert.equal(f.requests.length, count);
    remoteOwner = "replacement-core";
    await assert.rejects(client.get(target), errorKind("changed"));
    await assert.rejects(client.read(target, -1), errorKind("protocol"));
  } finally {
    client.close();
    await f.close();
  }
});

test("program fingerprint ignores presentation aliases/status but changes for observed process replacements", () => {
  const fingerprint = hcProgramFingerprint(item);
  assert.equal(
    hcProgramFingerprint({ ...item, address: "new-alias/t1", name: "renamed", status: { state: "idle" }, turn: 22 }),
    fingerprint,
  );
  for (const patch of [
    { pid: 43 },
    { argv: ["sh"] },
    { created_ms: 2 },
    { state: "finished" },
    { reason: "holder_lost" },
    { foreground: { pid: 9, name: "sh", argv: ["sh"], cwd: "/" } },
  ])
    assert.notEqual(hcProgramFingerprint({ ...item, ...patch }), fingerprint);
});

test("event channel has its own hello, atomic snapshot, patch invalidations and missed replacement cursor", async () => {
  let eventSocket: Socket | undefined;
  const f = await fixture((request, socket) => {
    if (request.method === "events.subscribe") {
      eventSocket = socket;
      // Same chunk as the subscription result exercises the promise/notification transition.
      socket.write(
        [
          { jsonrpc: "2.0", id: request.id, result: { seq: 10, terminals: [item] } },
          {
            jsonrpc: "2.0",
            method: "event",
            params: { seq: 11, type: "created", terminal: "t1", data: { record: item } },
          },
          {
            jsonrpc: "2.0",
            method: "event",
            params: { seq: 50, type: "status", terminal: "t1", data: { status: { state: "idle" } } },
          },
          { jsonrpc: "2.0", method: "missed", params: { seq: 80, terminals: [] } },
          { jsonrpc: "2.0", method: "event", params: { seq: 60, type: "removed", terminal: "t1", data: {} } },
          { jsonrpc: "2.0", method: "event", params: { seq: 81, type: "restarted", terminal: "t1", data: {} } },
          { jsonrpc: "2.0", method: "heartbeat", params: { seq: 90 } },
        ]
          .map((value) => JSON.stringify(value))
          .join("\n") + "\n",
      );
      return true;
    }
  });
  const client = await HcClient.connect(f.path);
  try {
    let changes = 0;
    const invalidations: unknown[] = [];
    let disconnected = 0;
    let finish!: (error: Error) => void;
    const closed = new Promise<Error>((resolve) => {
      finish = resolve;
    });
    const stop = await client.observe(
      (event) => {
        changes++;
        invalidations.push(event);
      },
      (error) => {
        disconnected++;
        finish(error);
      },
    );
    assert.equal(changes, 5);
    assert.deepEqual(invalidations, [
      { type: "snapshot" },
      { type: "created", terminal: "t1" },
      { type: "status", terminal: "t1" },
      { type: "missed" },
      { type: "restarted", terminal: "t1" },
    ]);
    assert.equal(f.requests.filter((r) => r.method === "hello").length, 2);
    assert.deepEqual(
      f.requests.filter((r) => r.method === "hello").map((r) => r.params),
      [
        { generation: 1, framed: false },
        { generation: 1, framed: false },
      ],
    );
    eventSocket!.end();
    assert.ok((await closed) instanceof HcError);
    assert.equal(disconnected, 1);
    assert.equal(changes, 5, "EOF marks stale without inventing finished terminals");
    stop();
    stop();
  } finally {
    client.close();
    await f.close();
  }
});

test("event connection rejects host identity replacement and cleans up intentional unsubscribe", async () => {
  let replacement = true;
  let eventSocket: Socket | undefined;
  const f = await fixture((request, socket, connection) => {
    if (request.method === "hello" && connection > 1 && replacement) {
      reply(socket, request.id, { ...hello, core: { id: "replacement", name: "elsewhere" } });
      return true;
    }
    if (request.method === "events.subscribe") eventSocket = socket;
  });
  const client = await HcClient.connect(f.path);
  try {
    await assert.rejects(
      client.observe(
        () => {},
        () => {},
      ),
      errorKind("changed"),
    );
    assert.equal(
      f.requests.some((r) => r.method === "events.subscribe"),
      false,
    );
    replacement = false;
    let disconnects = 0;
    const stop = await client.observe(
      () => {},
      () => {
        disconnects++;
      },
    );
    const ended = once(eventSocket!, "end");
    stop();
    await ended;
    assert.equal(disconnects, 0);
  } finally {
    client.close();
    await f.close();
  }
});

test("malformed event snapshots and patches fail closed; fresh subscriptions reset sequence", async () => {
  let eventSocket: Socket | undefined;
  let initial = 100;
  const f = await fixture((request, socket) => {
    if (request.method === "events.subscribe") {
      eventSocket = socket;
      reply(socket, request.id, { seq: initial, terminals: [item] });
      return true;
    }
  });
  const client = await HcClient.connect(f.path);
  try {
    let failed!: (error: Error) => void;
    const failure = new Promise<Error>((resolve) => {
      failed = resolve;
    });
    const stop = await client.observe(() => {}, failed);
    notification(eventSocket!, "missed", { seq: 101, terminals: [{ address: "t1" }] });
    assert.ok(errorKind("protocol")(await failure));
    stop();
    initial = 1;
    let changes = 0;
    let changed!: () => void;
    const observed = new Promise<void>((resolve) => {
      changed = resolve;
    });
    const unsubscribe = await client.observe(
      () => {
        changes++;
        if (changes === 2) changed();
      },
      () => {},
    );
    notification(eventSocket!, "event", { seq: 2, type: "lost", terminal: "t1", data: {} });
    await observed;
    assert.equal(changes, 2);
    unsubscribe();
  } finally {
    client.close();
    await f.close();
  }
});

test("explicit keys and reviewed forced text are allowed without retry or success overclaim", async () => {
  const f = await fixture();
  const client = await HcClient.connect(f.path);
  try {
    const address = `${core.id}/t1`;
    await client.request("terminal.keys", { terminal: address, keys: ["enter"] });
    await client.request("terminal.send", { terminal: address, text: "approved reply", force: true, wait: false });
    await client.request("terminal.send", {
      terminal: address,
      text: "ordinary task",
      force: false,
      if: "idle",
      wait: false,
    });
    assert.equal(f.requests.filter((r) => r.method === "terminal.keys").length, 1);
    assert.deepEqual(
      f.requests.filter((r) => r.method === "terminal.send").map((r) => r.params.force),
      [true, false],
    );
    await assert.rejects(client.request("terminal.keys", { terminal: "t1", keys: ["enter"] }), errorKind("changed"));
  } finally {
    client.close();
    await f.close();
  }
});

test("RPC errors are sanitized; blocked is known, transport/malformed mutation responses are uncertain", async () => {
  for (const mode of ["blocked", "status_mismatch", "unavailable", "malformed", "disconnect", "close"]) {
    let sent!: () => void;
    const received = new Promise<void>((resolve) => {
      sent = resolve;
    });
    const f = await fixture((request, socket) => {
      if (request.method !== "terminal.send") return;
      sent();
      if (mode === "disconnect") socket.end();
      else if (mode === "malformed") reply(socket, request.id, { status: "blocked", turn: "SECRET" });
      else if (mode !== "close")
        socket.write(
          JSON.stringify({
            jsonrpc: "2.0",
            id: request.id,
            error: { code: -32000, message: "SECRET", data: { kind: mode, hint: "SECRET" } },
          }) + "\n",
        );
      return true;
    });
    const client = await HcClient.connect(f.path);
    try {
      const pending = client.request("terminal.send", { terminal: `${core.id}/t1`, text: "SECRET", force: true });
      const rejected = assert.rejects(
        pending,
        (error: unknown) =>
          error instanceof HcError &&
          error.kind === (mode === "blocked" ? "blocked" : mode === "status_mismatch" ? "changed" : "unknown") &&
          !error.message.includes("SECRET"),
      );
      await received;
      if (mode === "close") client.close();
      await rejected;
      assert.equal(f.requests.filter((r) => r.method === "terminal.send").length, 1);
    } finally {
      client.close();
      await f.close();
    }
  }
});

test("mutations reject aliases, unknown owners and disconnected machines before input", async () => {
  let state = "connected";
  const f = await fixture((request, socket) => {
    if (request.method === "machine.list") {
      reply(socket, request.id, { machines: [{ ...remote, state }] });
      return true;
    }
  });
  const client = await HcClient.connect(f.path);
  try {
    for (const prefix of [remote.name, "unknown-core", core.name])
      await assert.rejects(
        client.request("terminal.keys", { terminal: `${prefix}/t1`, keys: ["enter"] }),
        errorKind("changed"),
      );
    state = "needs_login";
    await assert.rejects(
      client.request("terminal.send", { terminal: `${remote.id}/t1`, text: "reply", force: true }),
      errorKind("offline"),
    );
    assert.equal(
      f.requests.some((request) => ["terminal.keys", "terminal.send"].includes(request.method)),
      false,
    );
    state = "connected";
    await client.request("terminal.keys", { terminal: `${remote.id}/t1`, keys: ["enter"] });
    assert.equal(f.requests.filter((request) => request.method === "terminal.keys").length, 1);
  } finally {
    client.close();
    await f.close();
  }
});

test("mutation timeout is uncertain, closes the transport and never retries", async (t) => {
  let received!: () => void;
  const sent = new Promise<void>((resolve) => {
    received = resolve;
  });
  const f = await fixture((request) => {
    if (request.method === "terminal.keys") {
      received();
      return true;
    }
  });
  const client = await HcClient.connect(f.path);
  try {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const pending = client.request("terminal.keys", { terminal: `${core.id}/t1`, keys: ["enter"] });
    const rejected = assert.rejects(pending, errorKind("unknown"));
    await sent;
    t.mock.timers.tick(29_999);
    t.mock.timers.tick(1);
    await rejected;
    assert.equal(f.requests.filter((request) => request.method === "terminal.keys").length, 1);
    await assert.rejects(client.catalogue(), errorKind("offline"));
  } finally {
    t.mock.timers.reset();
    client.close();
    await f.close();
  }
});

test("handshake timeout closes its socket and refuses incompatible RPC errors without leaking details", async (t) => {
  let received!: () => void;
  const sent = new Promise<void>((resolve) => {
    received = resolve;
  });
  const f = await fixture((request) => {
    if (request.method === "hello") {
      received();
      return true;
    }
  });
  try {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const pending = HcClient.connect(f.path);
    const rejected = assert.rejects(pending, errorKind("offline"));
    await sent;
    t.mock.timers.tick(5_000);
    await rejected;
  } finally {
    t.mock.timers.reset();
    await f.close();
  }
  const incompatible = await fixture((request, socket) => {
    if (request.method === "hello") {
      socket.write(
        JSON.stringify({
          jsonrpc: "2.0",
          id: request.id,
          error: { code: -32000, message: "SECRET", data: { kind: "unsupported_generation", hint: "SECRET" } },
        }) + "\n",
      );
      return true;
    }
  });
  try {
    await assert.rejects(
      HcClient.connect(incompatible.path),
      (error: unknown) => errorKind("incompatible")(error) && !(error as Error).message.includes("SECRET"),
    );
  } finally {
    await incompatible.close();
  }
});

test("catalogue accepts HC's omitted empty machine table and fetches pinned fallback only when absent", async () => {
  for (const embedded of [false, true]) {
    const f = await fixture((request, socket) => {
      if (request.method === "terminal.list") {
        reply(socket, request.id, { terminals: [item], hidden_finished: 0, ...(embedded ? { machines: [] } : {}) });
        return true;
      }
      if (request.method === "machine.list") {
        reply(socket, request.id, { machines: [] });
        return true;
      }
    });
    const client = await HcClient.connect(f.path);
    try {
      assert.deepEqual(await client.catalogue(), { core, terminals: [item], machines: [] });
      assert.equal(f.requests.filter((request) => request.method === "machine.list").length, embedded ? 0 : 1);
    } finally {
      client.close();
      await f.close();
    }
  }
});

test("optional machine table still rejects explicit null or malformed values", async () => {
  for (const machines of [null, {}, [{ id: "remote-core" }]]) {
    const f = await fixture((request, socket) => {
      if (request.method === "terminal.list") {
        reply(socket, request.id, { terminals: [item], machines });
        return true;
      }
    });
    const client = await HcClient.connect(f.path);
    try {
      await assert.rejects(client.catalogue(), errorKind("protocol"));
    } finally {
      client.close();
      await f.close();
    }
  }
});
