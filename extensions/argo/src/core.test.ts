import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import type { Message, Session } from "./protocol.js";
import { once } from "node:events";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { consumeEvents, Hub, HubError, parseConfig, readConfig, remotePrompt, safeMarkdown } from "./core.js";

const token = "a".repeat(64);

test("configuration accepts only credential-free loopback origins", () => {
  for (const url of ["http://127.0.0.1:48123", "http://localhost:48123", "http://[::1]:48123"]) {
    assert.equal(parseConfig({ url, token }).token, token);
  }
  for (const url of [
    "https://example.com",
    "http://192.168.1.2",
    "http://127.0.0.1.evil.com",
    "http://user:pass@localhost",
    "http://localhost/?token=secret",
    "http://localhost/path",
    "file:///tmp/private",
  ]) {
    assert.throws(() => parseConfig({ url, token }));
  }
  assert.throws(() => parseConfig({ url: "http://localhost", token: "" }));
});

test("configuration file is private and malformed secrets never appear in errors", async () => {
  const directory = await mkdtemp(join(tmpdir(), "argo-raycast-"));
  const path = join(directory, "client.json");
  try {
    await writeFile(path, JSON.stringify({ url: "http://127.0.0.1:48123", token }), { mode: 0o600 });
    assert.equal((await readConfig(path)).token, token);
    await chmod(path, 0o644);
    await assert.rejects(readConfig(path), /private permissions/);
    await chmod(path, 0o600);
    await writeFile(path, `{"token":"${token}`);
    await assert.rejects(
      readConfig(path),
      (error: unknown) => error instanceof Error && !error.message.includes(token),
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("agent markdown cannot create image, link, HTML, or autolink syntax", () => {
  const hostile =
    "![inline](https://evil.test/pixel) ![ref][id]\n[id]: https://evil.test/pixel\n<img src='https://evil.test/pixel'> <https://evil.test> [open](file:///private) \\![escaped](https://evil.test) &#33;[entity](https://evil.test)";
  const result = safeMarkdown(hostile);
  assert.ok(!/[![\]<>:\\]/.test(result));
  assert.match(result, /&amp;#33;/);
  assert.equal(safeMarkdown("**bold**\n\nplain"), "**bold**\n\nplain");
});

test("SSE parser handles fragmented CRLF, comments, and multiline data", async () => {
  const input =
    ': heartbeat\r\nid: 42\r\ndata: {"cursor":42,\r\ndata: "bindingId":"session", "type":"message", "createdAt":1}\r\n\r\n';
  const bytes = new TextEncoder().encode(input);
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const byte of bytes) controller.enqueue(new Uint8Array([byte]));
      controller.close();
    },
  });
  const events: unknown[] = [];
  await consumeEvents(stream, (event) => events.push(event));
  assert.deepEqual(events, [{ cursor: 42, bindingId: "session", type: "message", createdAt: 1 }]);
});

test("hub uses bearer auth, rejects redirects, and releases in-flight fetch on close", async () => {
  const server = createServer((request, response) => {
    assert.equal(request.headers.authorization, `Bearer ${token}`);
    assert.ok(!request.url?.includes(token));
    if (request.url === "/v1/sessions") response.writeHead(302, { Location: "http://localhost/secret" }).end();
    else if (request.url === "/v1/sessions/missing") response.writeHead(404).end();
    else if (request.url === "/v1/sessions/wait") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.flushHeaders();
    }
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const hub = new Hub({ url: `http://127.0.0.1:${address.port}`, token });
  try {
    await assert.rejects(hub.sessions());
    await assert.rejects(
      hub.snapshot("missing"),
      (error: unknown) => error instanceof HubError && error.status === 404,
    );
    const waiting = hub.snapshot("wait");
    const assertion = assert.rejects(waiting);
    hub.close();
    await assertion;
  } finally {
    hub.close();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

// Raycast supplies its runtime inside the app, not Node. Evaluate the actual view's
// declarations with small UI/hook stubs; no Agent credentials or user content are read.
function viewLogic(names: string[], globals: Record<string, unknown> = {}) {
  const source = ts.createSourceFile(
    "sessions.tsx",
    readFileSync(new URL("./sessions.tsx", import.meta.url), "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const declarations = source.statements.filter(
    (node) =>
      (ts.isFunctionDeclaration(node) && names.includes(node.name?.text || "")) ||
      (ts.isVariableStatement(node) &&
        node.declarationList.declarations.some((item) => ts.isIdentifier(item.name) && names.includes(item.name.text))),
  );
  assert.equal(declarations.length, names.length, `Missing view declaration: ${names.join(", ")}`);
  return runInNewContext(
    ts.transpileModule(declarations.map((node) => node.getText(source)).join("\n"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.React,
        jsxFactory: "element",
        jsxFragmentFactory: "Fragment",
        target: ts.ScriptTarget.ES2023,
      },
    }).outputText + `\n({${names.join(",")}})`,
    { exports: {}, ...globals },
  );
}
function selectionLogic(): typeof import("./sessions.js").conversationSelection {
  return viewLogic(["conversationSelection"]).conversationSelection;
}

type View = { type: unknown; props: Record<string, any> };
function viewHarness() {
  const states: unknown[] = [];
  const effects: (() => void)[] = [];
  let cursor = 0;
  const member = (name: string) => Object.assign({}, { name });
  const Metadata = Object.assign(member("Metadata"), { Label: "Label" });
  return {
    reset: () => {
      cursor = 0;
    },
    effects,
    globals: {
      element: (type: unknown, props: object, ...children: unknown[]) => ({ type, props: { ...props, children } }),
      Keyboard: {
        Shortcut: { Common: { New: { modifiers: ["cmd"], key: "n" }, Refresh: { modifiers: ["cmd"], key: "r" } } },
      },
      Fragment: "Fragment",
      Color: {},
      Icon: {},
      useState(initial: unknown) {
        const index = cursor++;
        if (!(index in states)) states[index] = initial;
        return [
          states[index],
          (value: unknown) => {
            states[index] = typeof value === "function" ? value(states[index]) : value;
          },
        ];
      },
      useRef(initial: unknown) {
        const index = cursor++;
        if (!(index in states)) states[index] = { current: initial };
        return states[index];
      },
      useEffect: (effect: () => void) => effects.push(effect),
      List: Object.assign(member("List"), {
        EmptyView: "EmptyView",
        Section: "Section",
        Item: Object.assign(member("Item"), { Detail: Object.assign(member("ItemDetail"), { Metadata }) }),
      }),
      Detail: Object.assign(member("Detail"), { Metadata }),
      Form: Object.assign(member("Form"), { Description: "Description", TextArea: "TextArea" }),
      ActionPanel: "ActionPanel",
      Action: Object.assign(member("Action"), {
        Push: "Push",
        SubmitForm: "SubmitForm",
        CopyToClipboard: "CopyToClipboard",
        Style: {},
      }),
      PreferencesAction: "PreferencesAction",
      Setup: "Setup",
      DiscoverBridges: "DiscoverBridges",
      SessionList: "SessionList",
      Compose: "Compose",
      Conversation: "Conversation",
      Toast: { Style: { Failure: "failure", Success: "success" } },
      safeMarkdown,
      HubError,
    },
  };
}
function views(value: unknown): View[] {
  if (Array.isArray(value)) return value.flatMap(views);
  if (!value || typeof value !== "object" || !("props" in value)) return [];
  const view = value as View;
  return [view, ...views(view.props.children), ...views(view.props.actions)];
}
const sessionFixture = (overrides: Partial<Session> = {}): Session => ({
  id: "session",
  name: "Backend",
  adapter: "claude",
  generation: "g1",
  nativeSessionId: null,
  machine: "work-mac",
  cwd: "/work/backend",
  online: true,
  status: "ready",
  capabilities: { send: true, streaming: true, interrupt: false, approvals: false, questions: false },
  updatedAt: 1,
  revoked: false,
  ...overrides,
});

test("conversation selects the newest assistant and follows only its actively sent reply until history is selected", () => {
  const select = selectionLogic();
  const message = (id: string, createdAt: number, role: Message["role"] = "assistant", replyTo?: string): Message => ({
    id,
    createdAt,
    role,
    replyTo,
    text: id,
    state: "accepted",
  });
  const history = [message("old", 1), message("latest", 3), message("user", 4, "user"), message("middle", 2)];
  let state = select({}, { type: "select", id: "status" });
  assert.equal(state.selectedItemId, undefined, "the loading status default must not count as browsing history");
  state = select(state, { type: "snapshot", generation: "g1", messages: history });
  assert.equal(
    state.selectedItemId,
    "latest",
    "first snapshot selects the newest assistant, not status or a newer user message",
  );
  state = select(state, { type: "select", id: "latest" });
  state = select(state, { type: "send", messageId: "sent-1" });
  state = select(state, { type: "select", id: "latest" });
  state = select(state, { type: "select", id: null });
  state = select(state, {
    type: "snapshot",
    generation: "g1",
    messages: [...history, message("unrelated", 5, "assistant", "another-send")],
  });
  assert.equal(state.selectedItemId, "latest", "unrelated replies do not satisfy the active send");
  const reply = message("reply-1", 6, "assistant", "sent-1");
  state = select(state, { type: "snapshot", generation: "g1", messages: [...history, reply] });
  assert.equal(state.selectedItemId, "reply-1", "the matching reply is selected as soon as it appears");
  state = select(state, { type: "select", id: "reply-1" });
  const streaming = [...history, { ...reply, text: "streamed text", state: "completed" as const }];
  assert.equal(select(state, { type: "snapshot", generation: "g1", messages: streaming }).selectedItemId, "reply-1");
  state = select(state, {
    type: "snapshot",
    generation: "g1",
    messages: [...streaming, message("reply-2", 7, "assistant", "sent-1")],
  });
  assert.equal(
    state.selectedItemId,
    "reply-2",
    "programmatic selection callbacks must not disable following subsequent reply items",
  );
  state = select(state, { type: "select", id: "old" });
  state = select(state, {
    type: "snapshot",
    generation: "g1",
    messages: [...streaming, message("reply-3", 8, "assistant", "sent-1")],
  });
  assert.equal(state.selectedItemId, "old", "browsing history disables following, even while the old reply streams");
  state = select(state, { type: "send", messageId: "sent-2" });
  state = select(state, {
    type: "snapshot",
    generation: "g1",
    messages: [...streaming, message("late-old-reply", 9, "assistant", "sent-1")],
  });
  assert.equal(state.selectedItemId, "old");
  state = select(state, {
    type: "snapshot",
    generation: "g1",
    messages: [...streaming, message("new-reply", 10, "assistant", "sent-2")],
  });
  assert.equal(state.selectedItemId, "new-reply", "a new explicit send restarts following");
  state = select(state, { type: "select", id: "request:approval" });
  assert.equal(
    select(state, { type: "snapshot", generation: "g1", messages: streaming }).selectedItemId,
    "request:approval",
  );
  state = select(state, { type: "snapshot", generation: "g2", messages: [message("rebound-reply", 11)] });
  assert.equal(
    state.selectedItemId,
    "rebound-reply",
    "a new binding generation resets selection and old reply tracking",
  );
  assert.equal(state.replyTo, undefined);
});

test("conversation initializes empty and user-only snapshots once without stealing focus on refresh", () => {
  const select = selectionLogic();
  let state = select({}, { type: "snapshot", generation: "g1", messages: [] });
  assert.equal(state.selectedItemId, "empty");
  state = select(state, { type: "select", id: "older" });
  assert.equal(select(state, { type: "snapshot", generation: "g1", messages: [] }).selectedItemId, "older");
  const user: Message = { id: "user", role: "user", createdAt: 1, text: "prompt", state: "queued" };
  state = select({}, { type: "snapshot", generation: "g1", messages: [user] });
  assert.equal(state.selectedItemId, "user");
  assert.equal(select(state, { type: "snapshot", generation: "g1", messages: [user] }), state);
});

test("remote setup prompt keeps names as data and clearly discloses pull handoff", () => {
  const code = "ARGO-" + "a".repeat(32);
  const prompt = remotePrompt("backend\nnot a shell command", "http://127.0.0.1:49123", code);
  assert.ok(prompt.includes("https://github.com/MatrixA/argo/blob/v0.1.3/docs/connect.md"));
  assert.ok(prompt.includes(JSON.stringify("backend\nnot a shell command")));
  assert.ok(prompt.includes(code));
  assert.match(prompt, /waiting occupies this session/);
  assert.match(prompt, /stdin/);
  assert.throws(() => remotePrompt("backend", "https://public.example", code));
  assert.throws(() => remotePrompt("backend", "http://127.0.0.1:49123", "invalid"));
});

test("Raycast pairing uses admin authentication only for creation and cancellation", async () => {
  const code = "ARGO-" + "b".repeat(32);
  const seen: string[] = [];
  const server = createServer(async (request, response) => {
    assert.equal(request.headers.authorization, `Bearer ${token}`);
    assert.equal(request.url, "/v1/pairings");
    seen.push(request.method!);
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (request.method === "POST") {
      assert.deepEqual(body, { name: "backend", adapter: "claude" });
      response
        .writeHead(201, { "Content-Type": "application/json" })
        .end(JSON.stringify({ code, expiresAt: Date.now() + 600000 }));
    } else {
      assert.deepEqual(body, { code });
      response.writeHead(200).end("{}");
    }
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const hub = new Hub({ url: `http://127.0.0.1:${address.port}`, token });
  try {
    assert.equal((await hub.createPairing("backend")).code, code);
    await hub.cancelPairing(code);
    assert.deepEqual(seen, ["POST", "DELETE"]);
  } finally {
    hub.close();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("session groups, labels and activity ordering distinguish attention from offline", () => {
  const { sessionStatus, sessionGroup, orderedSessions } = viewLogic([
    "sessionStatus",
    "sessionGroup",
    "orderedSessions",
  ]);
  const sessions = [
    sessionFixture({ id: "offline", online: false, status: "error", updatedAt: 99 }),
    sessionFixture({ id: "ready", updatedAt: 8 }),
    sessionFixture({ id: "waiting", status: "waiting", updatedAt: 4 }),
    sessionFixture({ id: "busy", status: "busy", updatedAt: 10 }),
    sessionFixture({ id: "uncertain", uncertainMessageId: "unknown", updatedAt: 7 }),
    sessionFixture({ id: "revoked", revoked: true, updatedAt: 100 }),
  ];
  assert.equal(sessionStatus(sessions[0]), "Offline");
  assert.equal(sessionStatus(sessions[2]), "Needs Input");
  assert.equal(sessionStatus(sessions[3]), "Working");
  assert.equal(sessionStatus(sessions[4]), "Check Agent");
  assert.equal(sessionStatus(sessions[5]), "Unbound");
  assert.equal(sessionGroup(sessions[0]), "Offline");
  assert.deepEqual(
    Array.from(orderedSessions(sessions), (item: Session) => item.id),
    ["uncertain", "waiting", "busy", "ready", "revoked", "offline"],
  );
  assert.equal(sessions[0]!.id, "offline", "sorting must not mutate the live feed");
});

test("session list disambiguates identical ids on different bridges and always exposes discovery and failed bridges", () => {
  const harness = viewHarness();
  const pushed: View[] = [];
  const bridge = (id: string) => ({
    profile: { id, name: id },
    sessions: [sessionFixture()],
    connection: "live",
    connectionKey: `key-${id}`,
  });
  const feed = {
    bridges: [
      bridge("work"),
      bridge("server"),
      { ...bridge("failed"), sessions: [], connection: "offline", error: "Bridge unavailable" },
    ],
    loading: false,
    savedCount: 3,
    reconnect() {},
  };
  const { SessionList } = viewLogic(
    ["project", "title", "sessionStatus", "sessionGroup", "orderedSessions", "statusColor", "SessionList"],
    {
      ...harness.globals,
      useBridges: () => feed,
      useNavigation: () => ({ push: (view: View) => pushed.push(view) }),
    },
  );
  const items = views(SessionList({}));
  assert.ok(items.some((item) => item.props.id === "connect-agent"));
  assert.ok(items.some((item) => item.props.title === "Find Forwarded Bridges"));
  assert.ok(items.some((item) => item.props.id === "bridge:failed" && item.props.accessories[0].tag === "Unavailable"));
  for (const id of ["work", "server"]) {
    const session = items.find((item) => item.props.id === `${id}:session`)!;
    assert.equal(session.props.title, "Backend");
    assert.equal(session.props.subtitle, `backend · work-mac · ${id}`);
    assert.equal(session.props.accessories[1].tooltip, `Latest activity: ${new Date(1).toLocaleString()}`);
    views(session)
      .find((item) => item.props.title === "Open Conversation")!
      .props.onAction();
    assert.equal(pushed.at(-1)!.props.profileId, id);
    assert.equal(pushed.at(-1)!.props.connectionKey, `key-${id}`);
    assert.equal(pushed.at(-1)!.props.bindingId, "session");
  }
});

test("brand-new Mac opens discovery once, but saved/offline bridges never force setup", () => {
  for (const scenario of ["new", "saved", "working", "invalid"] as const) {
    const harness = viewHarness();
    const pushed: View[] = [];
    const feed = {
      bridges: [],
      loading: false,
      savedCount: scenario === "saved" ? 1 : 0,
      defaultUnavailable: scenario !== "working",
      error: scenario === "invalid" ? "Settings error" : undefined,
      reconnect() {},
    };
    const { SessionList } = viewLogic(
      ["project", "title", "sessionStatus", "sessionGroup", "orderedSessions", "statusColor", "SessionList"],
      {
        ...harness.globals,
        useBridges: () => feed,
        useNavigation: () => ({ push: (view: View) => pushed.push(view) }),
      },
    );
    SessionList({});
    harness.effects.at(-1)!();
    harness.reset();
    SessionList({});
    harness.effects.at(-1)!();
    assert.equal(pushed.length, scenario === "new" ? 1 : 0);
    if (scenario === "new") assert.equal(pushed[0]!.type, "DiscoverBridges");
  }
});

test("message labels explain queueing, receiving, processing and uncertain results without claiming completion", () => {
  const { messageStatus, sendUnavailable } = viewLogic(["messageStatus", "knownOnline", "sendUnavailable"]);
  const message: Message = { id: "message", role: "user", text: "synthetic test", state: "queued", createdAt: 1 };
  for (const [state, label] of [
    ["queued", "Queued"],
    ["submitted", "Agent Receiving"],
    ["accepted", "Processing"],
    ["completed", "Completed"],
    ["failed", "Failed"],
    ["unknown", "Result Unknown"],
  ]) {
    assert.equal(messageStatus({ ...message, state }).label, label);
  }
  assert.match(messageStatus({ ...message, state: "unknown" }).explanation, /never replayed automatically/);
  assert.match(messageStatus(message).explanation, /not yet received/);
  assert.equal(
    sendUnavailable(sessionFixture({ status: "busy" }), true),
    undefined,
    "busy online Agents accept queued messages",
  );
  assert.match(sendUnavailable(sessionFixture({ online: false }), true), /draft is kept/);
  assert.match(sendUnavailable(sessionFixture(), false), /reconnect/);
  assert.match(sendUnavailable(sessionFixture({ status: "unknown" }), true), /original Agent/);
});

test("offline conversation keeps Compose, copy and Jump to Latest Reply available and send failure explicit", async () => {
  const harness = viewHarness();
  const pushed: View[] = [],
    toasts: any[] = [];
  const messages: Message[] = [
    { id: "reply", role: "assistant", text: "Synthetic reply", state: "completed", createdAt: 2 },
  ];
  const draft = {
    text: "Offline draft",
    ready: true,
    change() {},
    clearIf() {
      assert.fail("unavailable sending must not clear the draft");
    },
  };
  const feed = {
    snapshot: { session: sessionFixture({ online: false }), messages, interactions: [] },
    connection: "offline",
    connectionKey: "bridge-a",
    hub: { current: undefined },
    reconnect() {},
  };
  const { Conversation } = viewLogic(
    [
      "project",
      "title",
      "sessionStatus",
      "knownOnline",
      "messageStatus",
      "sendUnavailable",
      "conversationSelection",
      "Conversation",
    ],
    {
      ...harness.globals,
      useHub: () => feed,
      useDraft: (binding: string, identity: string) => {
        assert.equal(binding, "session");
        assert.equal(identity, "bridge-a");
        return draft;
      },
      useNavigation: () => ({ push: (view: View) => pushed.push(view) }),
      showToast: async (toast: unknown) => {
        toasts.push(toast);
      },
    },
  );
  let tree = Conversation({ bindingId: "session", profileId: "server", connectionKey: "bridge-a" });
  harness.reset();
  tree = Conversation({ bindingId: "session", profileId: "server", connectionKey: "bridge-a" });
  const items = views(tree);
  assert.equal(tree.props.selectedItemId, "reply", "offline warning must not replace the latest response");
  assert.ok(!items.some((item) => item.props.id === "status"), "there is no default status row");
  assert.ok(items.some((item) => item.props.title === "Jump to Latest Reply" && item.props.shortcut.key === "j"));
  assert.ok(
    items.some((item) => item.props.title === "Copy Selected Message" && item.props.content === "Synthetic reply"),
  );
  const compose = items.find((item) => item.props.title === "Compose Local Draft")!;
  compose.props.onAction();
  assert.equal(pushed[0]!.props.text, draft.text);
  assert.equal(await pushed[0]!.props.send("Offline draft"), false);
  assert.equal(toasts.at(-1).title, "Message Not Sent");
  assert.match(toasts.at(-1).message, /draft stays on this Mac/);
  feed.connectionKey = "bridge-b";
  feed.connection = "live";
  harness.reset();
  tree = Conversation({ bindingId: "session", profileId: "server", connectionKey: "bridge-a" });
  assert.ok(
    !views(tree).some((item) => item.props.id === "reply"),
    "a different bridge's snapshot is never mixed into the pinned conversation",
  );
  assert.equal(
    await pushed[0]!.props.send("Offline draft"),
    false,
    "an already-open compose cannot send after changing bridge",
  );
  assert.match(toasts.at(-1).message, /connection changed/);
});

test("Compose preserves a failed draft and only closes after an explicit successful send", async () => {
  const harness = viewHarness();
  const changed: string[] = [],
    submitted: string[] = [];
  let popped = 0,
    succeeds = false;
  const { Compose } = viewLogic(["Compose"], {
    ...harness.globals,
    useNavigation: () => ({
      pop: () => {
        popped++;
      },
    }),
  });
  const render = () => {
    harness.reset();
    return Compose({
      text: "saved draft",
      change: (text: string) => changed.push(text),
      send: async (text: string) => {
        submitted.push(text);
        return succeeds;
      },
    });
  };
  views(render())
    .find((item) => item.props.id === "text")!
    .props.onChange("edited draft");
  assert.deepEqual(changed, ["edited draft"]);
  await views(render())
    .find((item) => item.type === "SubmitForm")!
    .props.onSubmit();
  assert.equal(popped, 0);
  assert.equal(views(render()).find((item) => item.props.id === "text")!.props.value, "edited draft");
  succeeds = true;
  await views(render())
    .find((item) => item.type === "SubmitForm")!
    .props.onSubmit();
  assert.deepEqual(submitted, ["edited draft", "edited draft"]);
  assert.equal(popped, 1);
});

test("Jump to Latest Reply returns from manual history without following unrelated replies", () => {
  const select = selectionLogic();
  const messages: Message[] = [
    { id: "old", role: "assistant", text: "old", state: "completed", createdAt: 1 },
    { id: "latest", role: "assistant", text: "latest", state: "accepted", createdAt: 3 },
    { id: "newer-user", role: "user", text: "user", state: "queued", createdAt: 4 },
  ];
  const state = select({ generation: "g1", selectedItemId: "old", replyTo: "send-1" }, { type: "latest", messages });
  assert.equal(state.selectedItemId, "latest");
  assert.equal(state.replyTo, undefined);
  assert.equal(
    select(state, {
      type: "snapshot",
      generation: "g1",
      messages: [...messages, { ...messages[1]!, id: "unrelated", createdAt: 5 }],
    }).selectedItemId,
    "latest",
  );
});

test("default command resumes the durable bridge reference, validates identity and falls back visibly without forgetting transient failures", async () => {
  const key = "a".repeat(24),
    last = "last-conversation-v1";
  for (const scenario of [
    "valid",
    "missing",
    "revoked",
    "offline",
    "removed",
    "changed",
    "malformed",
    "legacy",
    "none",
    "browse",
    "unscoped",
  ] as const) {
    const harness = viewHarness();
    const removed: string[] = [],
      reads: string[] = [],
      loads: (string | undefined)[] = [];
    const saved = JSON.stringify({ profileId: "server", bindingId: "session", connectionKey: key });
    const data = new Map<string, string>(
      scenario === "legacy"
        ? [[`recent-binding:${key}`, "session"]]
        : ["none", "browse"].includes(scenario)
          ? []
          : [[last, scenario === "malformed" ? "not json" : saved]],
    );
    let closed = 0,
      constructed = 0;
    const { SessionCommand } = viewLogic(["SessionCommand", "parseLastConversation"], {
      ...harness.globals,
      LAST_CONVERSATION_KEY: last,
      portRange: () => [49120],
      getPreferenceValues: () => ({ configPath: "/synthetic/client.json" }),
      loadConnection: async (_storage: unknown, _path: string, id?: string) => {
        loads.push(id);
        if (scenario === "removed") throw new Error("Removed");
        return {
          config: { url: "http://127.0.0.1:1", token },
          profile: { id: id ?? "active-other" },
          connectionKey: scenario === "changed" ? "b".repeat(24) : key,
        };
      },
      recentKey: (identity: string) => `recent-binding:${identity}`,
      LocalStorage: {
        getItem: async (name: string) => {
          reads.push(name);
          return data.get(name);
        },
        removeItem: async (name: string) => {
          removed.push(name);
          data.delete(name);
        },
      },
      Hub: class {
        constructor() {
          constructed++;
        }
        async sessions() {
          if (scenario === "offline") throw new Error("synthetic offline");
          return { sessions: scenario === "missing" ? [] : [sessionFixture({ revoked: scenario === "revoked" })] };
        }
        close() {
          closed++;
        }
      },
    });
    const props = scenario === "browse" ? { recent: false } : scenario === "unscoped" ? { bindingId: "session" } : {};
    SessionCommand(props);
    harness.effects[0]!();
    await new Promise<void>((resolve) => setImmediate(resolve));
    harness.reset();
    const result = SessionCommand(props);
    if (["valid", "legacy"].includes(scenario)) {
      assert.equal(result.type, "Conversation");
      assert.equal(result.props.connectionKey, key);
      assert.equal(result.props.profileId, scenario === "valid" ? "server" : "active-other");
    } else {
      assert.equal(result.type, "SessionList");
      if (scenario !== "browse") assert.ok(result.props.notice, "fallback explains why resume failed");
    }
    if (["malformed", "browse", "unscoped"].includes(scenario)) assert.equal(loads.length, 0);
    else
      assert.deepEqual(
        loads,
        [scenario === "legacy" || scenario === "none" ? undefined : "server"],
        "the active bridge cannot redirect a durable reference",
      );
    assert.deepEqual(removed, ["missing", "revoked"].includes(scenario) ? [last] : []);
    assert.equal(closed, constructed, "temporary validation clients are always closed");
    if (["offline", "removed", "changed"].includes(scenario)) assert.equal(data.get(last), saved);
    if (!["legacy", "none", "browse"].includes(scenario))
      assert.ok(
        !reads.includes(`recent-binding:${key}`),
        "durable references never fall through to another bridge's legacy recent",
      );
  }
});

test("opening a valid conversation persists only its bridge, binding and nonsecret identity", async () => {
  const harness = viewHarness();
  const writes = new Map<string, string>();
  const key = "a".repeat(24);
  const feed = {
    snapshot: { session: sessionFixture(), messages: [], interactions: [] },
    connection: "live",
    connectionKey: key,
    hub: { current: {} },
  };
  const { Conversation } = viewLogic(
    [
      "project",
      "title",
      "sessionStatus",
      "knownOnline",
      "messageStatus",
      "sendUnavailable",
      "conversationSelection",
      "Conversation",
    ],
    {
      ...harness.globals,
      LAST_CONVERSATION_KEY: "last-conversation-v1",
      recentKey: (identity: string) => `recent-binding:${identity}`,
      useHub: (binding: string, profile: string, expected: string) => {
        assert.equal(binding, "session");
        assert.equal(profile, "server");
        assert.equal(expected, key);
        return feed;
      },
      useDraft: () => ({ text: "", ready: true }),
      useNavigation: () => ({ push() {} }),
      LocalStorage: {
        async setItem(name: string, value: string) {
          writes.set(name, value);
        },
      },
      showToast() {},
    },
  );
  Conversation({ bindingId: "session", profileId: "server", connectionKey: key });
  harness.effects.forEach((effect) => effect());
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.deepEqual(JSON.parse(writes.get("last-conversation-v1")!), {
    profileId: "server",
    bindingId: "session",
    connectionKey: key,
  });
  assert.equal(writes.get(`recent-binding:${key}`), "session");
  assert.ok(!JSON.stringify([...writes]).includes(token));
});

test("Codex pairing prompt targets its exact existing shared runtime without Claude pull", () => {
  const code = "ARGO-" + "c".repeat(32);
  const prompt = remotePrompt("server-codex", "http://127.0.0.1:49123", code, "codex");
  assert.match(prompt, /v0\.1\.3\/docs\/connect-codex\.md/);
  assert.match(prompt, /CODEX_THREAD_ID/);
  assert.match(prompt, /--agent codex/);
  assert.match(prompt, /Do not guess from history/);
  assert.match(prompt, /experimental/);
  assert.ok(!prompt.includes("CLAUDE_SESSION_ID"));
  assert.ok(!prompt.includes("receive/reply loop"));
});
test("Codex pairing request is explicitly scoped to the Codex adapter", async () => {
  const code = "ARGO-" + "d".repeat(32);
  const server = createServer(async (request, response) => {
    assert.equal(request.headers.authorization, `Bearer ${token}`);
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    assert.deepEqual(JSON.parse(Buffer.concat(chunks).toString()), { name: "server-codex", adapter: "codex" });
    response
      .writeHead(201, { "Content-Type": "application/json" })
      .end(JSON.stringify({ code, expiresAt: Date.now() + 600000 }));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const hub = new Hub({ url: `http://127.0.0.1:${address.port}`, token });
  try {
    assert.equal((await hub.createPairing("server-codex", "codex")).code, code);
  } finally {
    hub.close();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("approval defaults to Allow without a second dialog and submits only once while busy", async () => {
  const harness = viewHarness();
  const decisions: string[] = [];
  let finish!: (ok: boolean) => void;
  let popped = 0;
  const request = {
    requestId: "synthetic-approval",
    kind: "approval",
    title: "Synthetic approval",
    detail: "No command is executed",
    state: "pending",
    expiresAt: Date.now() + 60_000,
  };
  const { Approval } = viewLogic(["Approval"], {
    ...harness.globals,
    useNavigation: () => ({
      pop: () => {
        popped++;
      },
    }),
    confirmAlert: () => {
      assert.fail("explicit Allow must not open a second confirmation dialog");
    },
  });
  const respond = async (_request: unknown, answer: { decision: string }) => {
    decisions.push(answer.decision);
    return new Promise<boolean>((resolve) => {
      finish = resolve;
    });
  };
  let tree = Approval({ request, respond });
  const actions = views(tree).filter((item) => item.type === harness.globals.Action);
  assert.equal(actions[0]!.props.title, "Allow Request");
  assert.equal(actions[1]!.props.title, "Deny Request");
  assert.deepEqual(Array.from(actions[1]!.props.shortcut.modifiers), ["cmd", "shift"]);
  assert.equal(actions[1]!.props.shortcut.key, "d");
  const submitted = actions[0]!.props.onAction();
  assert.deepEqual(decisions, ["allow"]);
  await actions[0]!.props.onAction();
  await actions[1]!.props.onAction();
  assert.deepEqual(decisions, ["allow"], "rapid repeated activation cannot switch an in-flight decision to deny");
  finish(false);
  await submitted;
  assert.equal(popped, 0, "failed submissions keep the review open");
  harness.reset();
  tree = Approval({ request, respond });
  const retry = views(tree)
    .find((item) => item.props.title === "Allow Request")!
    .props.onAction();
  finish(true);
  await retry;
  assert.deepEqual(decisions, ["allow", "allow"]);
  assert.equal(popped, 1);
});

test("approval rechecks expiry on activation and keeps denial an explicit separate action", async () => {
  for (const expired of [false, true]) {
    const harness = viewHarness();
    const decisions: string[] = [];
    const request = {
      requestId: "synthetic-approval",
      kind: "approval",
      title: "Synthetic",
      detail: "No command is executed",
      state: "pending",
      expiresAt: Date.now() + 60_000,
    };
    const { Approval } = viewLogic(["Approval"], { ...harness.globals, useNavigation: () => ({ pop() {} }) });
    const tree = Approval({
      request,
      respond: async (_request: unknown, answer: { decision: string }) => {
        decisions.push(answer.decision);
        return true;
      },
    });
    if (expired) request.expiresAt = Date.now() - 1;
    await views(tree)
      .find((item) => item.props.title === "Deny Request")!
      .props.onAction();
    assert.deepEqual(decisions, expired ? [] : ["deny"]);
  }
});
