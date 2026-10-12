import assert from "node:assert/strict";
import { test } from "node:test";
import {
  actOnSession,
  cleanupClosedSession,
  closeSessionWithConfirmation,
  listSessions,
  normalizeSessionUrl,
  parseSessionList,
  Session,
  SessionRunner,
} from "../src/lib/sessions";

const signal = () => new AbortController().signal;
const list = (sessions: string[]) => ({ success: true, data: { sessions } });
const session: Session = { id: "fixture", name: "fixture", label: "CLI", managed: false };

test("strict JSON session parsing, duplicates, empty state and unsafe names", () => {
  assert.deepEqual(parseSessionList(list(["z", "fixture", "z"])), ["fixture", "z"]);
  assert.deepEqual(parseSessionList(list([])), []);
  for (const result of [
    null,
    {},
    { success: false, data: { sessions: [] } },
    { success: true, data: { sessions: [5] } },
    list(["../secret"]),
    "raw output",
  ]) {
    assert.throws(() => parseSessionList(result));
  }
});

test("lists default and profile environments once, excludes native/stale records, preserves same-name isolation", async () => {
  const contexts = {
    fixture: { socketDirectory: "/fixture/sockets", fakeHome: "/fixture/home", applicationName: "Chrome" },
    peer: { socketDirectory: "/fixture/sockets", fakeHome: "/fixture/home" },
    stale: {},
    dia: { backend: "dia" as const },
    safari: { backend: "safari" as const },
  };
  const calls: unknown[] = [];
  const result = await listSessions(
    contexts,
    async (args, context) => {
      calls.push([args, context?.socketDirectory]);
      return list(["fixture"]);
    },
    signal(),
  );
  assert.equal(calls.length, 2);
  assert.equal(result.sessions.length, 2);
  assert.notEqual(result.sessions[0].id, result.sessions[1].id);
  assert.equal(result.sessions[0].managed, false);
  assert.equal(result.sessions[1].managed, true);
  assert.equal(result.failedSources, 0);
});

test("partial failures are reported without dropping healthy sources", async () => {
  const result = await listSessions(
    { fixture: { socketDirectory: "/fixture/socket" } },
    async (_, context) => {
      if (context) throw new Error("Unavailable");
      return list(["fixture"]);
    },
    signal(),
  );
  assert.equal(result.failedSources, 1);
  assert.equal(result.sessions.length, 1);
  await assert.rejects(
    listSessions(
      {},
      async () => {
        throw new Error("Unavailable");
      },
      signal(),
    ),
    /Unavailable/,
  );
});

test("close targets only the selected environment and rechecks liveness", async () => {
  const calls: string[][] = [];
  const selected = { ...session, context: { socketDirectory: "/fixture/socket" } };
  const run: SessionRunner = async (args, context) => {
    assert.equal(context, selected.context);
    calls.push(args);
    return args[0] === "session" ? list(["fixture"]) : { success: true };
  };
  await actOnSession(selected, { type: "close" }, run, signal());
  assert.deepEqual(calls, [
    ["session", "list"],
    ["--session", "fixture", "close"],
  ]);
});

test("stale IDs never execute open or close", async () => {
  for (const action of [{ type: "close" } as const, { type: "open", url: "example.com" } as const]) {
    const calls: string[][] = [];
    await assert.rejects(
      actOnSession(
        session,
        action,
        async (args) => {
          calls.push(args);
          return list([]);
        },
        signal(),
      ),
      /no longer active/,
    );
    assert.deepEqual(calls, [["session", "list"]]);
  }
});

test("open uses explicit session and URL without changing visibility or profiles", async () => {
  const calls: string[][] = [];
  await actOnSession(
    session,
    { type: "open", url: "example.com" },
    async (args) => {
      calls.push(args);
      return args[0] === "session" ? list(["fixture"]) : { success: true };
    },
    signal(),
  );
  assert.deepEqual(calls, [
    ["session", "list"],
    ["--session", "fixture", "open", "https://example.com/"],
  ]);
});

test("URL validation rejects credentials and executable protocols before any CLI call", async () => {
  for (const url of [
    "",
    "javascript:alert(1)",
    "file:///tmp/file",
    "https://user:secret@example.com",
    "--all",
    "https://",
  ]) {
    let called = false;
    await assert.rejects(
      actOnSession(
        session,
        { type: "open", url },
        async () => {
          called = true;
          return list([]);
        },
        signal(),
      ),
    );
    assert.equal(called, false);
  }
  assert.equal(normalizeSessionUrl(" http://localhost:3000/path "), "http://localhost:3000/path");
});

test("cancellation between liveness check and mutation prevents mutation", async () => {
  const controller = new AbortController();
  const calls: string[][] = [];
  await assert.rejects(
    actOnSession(
      session,
      { type: "close" },
      async (args) => {
        calls.push(args);
        controller.abort();
        return list(["fixture"]);
      },
      controller.signal,
    ),
    { name: "AbortError" },
  );
  assert.equal(calls.length, 1);
});

test("cancelled listing cannot publish stale results", async () => {
  const controller = new AbortController();
  await assert.rejects(
    listSessions(
      {},
      async () => {
        controller.abort();
        return list(["fixture"]);
      },
      controller.signal,
    ),
    { name: "AbortError" },
  );
});

test("declining destructive confirmation never invokes the CLI", async () => {
  let called = false;
  assert.equal(
    await closeSessionWithConfirmation(
      session,
      async () => false,
      async () => {
        called = true;
        return list(["fixture"]);
      },
      signal(),
    ),
    false,
  );
  assert.equal(called, false);
});

test("confirming close rechecks liveness; cancelling confirmation prevents mutation", async () => {
  const calls: string[][] = [];
  assert.equal(
    await closeSessionWithConfirmation(
      session,
      async () => true,
      async (args) => {
        calls.push(args);
        return args[0] === "session" ? list(["fixture"]) : { success: true };
      },
      signal(),
    ),
    true,
  );
  assert.deepEqual(calls, [
    ["session", "list"],
    ["--session", "fixture", "close"],
  ]);
  const controller = new AbortController();
  await assert.rejects(
    closeSessionWithConfirmation(
      session,
      async () => {
        controller.abort();
        return true;
      },
      async () => {
        throw new Error("Must not execute");
      },
      controller.signal,
    ),
    { name: "AbortError" },
  );
});

test("cleanup preserves unowned, changed and native bindings, and shared profile bridges", async () => {
  const context = { fakeHome: "/fixture/home", socketDirectory: "/fixture/socket" };
  const managed = { ...session, managed: true, context };
  let cleared = 0;
  const clear = async () => {
    cleared++;
  };
  await cleanupClosedSession(session, context, async () => list([]), clear, signal());
  await cleanupClosedSession(managed, { socketDirectory: "/changed" }, async () => list([]), clear, signal());
  await cleanupClosedSession(managed, { ...context, backend: "dia" }, async () => list([]), clear, signal());
  await cleanupClosedSession(managed, context, async () => list(["peer"]), clear, signal());
  await assert.rejects(
    cleanupClosedSession(
      managed,
      context,
      async () => {
        throw new Error("Unavailable");
      },
      clear,
      signal(),
    ),
  );
  assert.equal(cleared, 0);
  await cleanupClosedSession(managed, context, async () => list([]), clear, signal());
  assert.equal(cleared, 1);
});

test("unsuccessful mutations cannot report success or trigger cleanup", async () => {
  await assert.rejects(
    actOnSession(
      session,
      { type: "close" },
      async (args) => (args[0] === "session" ? list(["fixture"]) : { success: false, error: "private-cookie" }),
      signal(),
    ),
    /did not succeed/,
  );
});
