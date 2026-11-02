import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { createProfileBridgeHome, readRetainedEnvironments, removeSessionBinding } from "../src/lib/session-resources";
import { cleanupClosedSession, describeSessionSource, listSessions, Session } from "../src/lib/sessions";

test("closing a shared profile releases the name, preserves another binding and files, and keeps unbound peers discoverable", async () => {
  const context = { fakeHome: "/fixture/home", socketDirectory: "/fixture/socket", profile: "Work" };
  const contexts = { closed: context };
  const items: Record<string, string> = {
    "browser-session:closed": JSON.stringify(context),
    "browser-session:unrelated": JSON.stringify({ profile: "Personal" }),
  };
  const storage = {
    setItem: async (key: string, value: string) => {
      items[key] = value;
    },
    removeItem: async (key: string) => {
      delete items[key];
    },
  };
  const session: Session = {
    id: "fixture",
    name: "closed",
    managed: true,
    context,
    label: "Raycast",
    source: describeSessionSource(context),
  };
  let filesRemoved = false;
  await cleanupClosedSession(
    session,
    contexts,
    async () => ({ success: true, data: { sessions: ["unbound-peer"] } }),
    async (name, options) => {
      await removeSessionBinding(`browser-session:${name}`, context, options.preserveFiles, storage, async () => {
        filesRemoved = true;
      });
    },
    new AbortController().signal,
  );
  assert.equal(Object.hasOwn(items, "browser-session:closed"), false);
  assert.equal(filesRemoved, false);
  assert.equal(items["browser-session:unrelated"], JSON.stringify({ profile: "Personal" }));
  const retained = readRetainedEnvironments(items);
  assert.deepEqual(retained, [{ backend: "agent-browser", ...context }]);
  const result = await listSessions(
    {},
    async (_, source) => ({ success: true, data: { sessions: source ? ["unbound-peer"] : [] } }),
    new AbortController().signal,
    retained,
  );
  assert.equal(result.sessions.length, 1);
  assert.equal(result.sessions[0].name, "unbound-peer");
  assert.equal(result.sessions[0].managed, false);
  assert.equal(result.sessions[0].context?.socketDirectory, context.socketDirectory);
  // A new binding for the same name can now be saved without seeing the old profile.
  await storage.setItem(
    "browser-session:closed",
    JSON.stringify({ profile: "Personal", fakeHome: "/fixture/new-home" }),
  );
  assert.equal(JSON.parse(items["browser-session:closed"]).profile, "Personal");
  assert.deepEqual(readRetainedEnvironments(items), retained);
});

test("non-shared cleanup removes files and only the matching binding and retained resource record", async () => {
  const context = { fakeHome: "/fixture/home", socketDirectory: "/fixture/socket" };
  const items: Record<string, string> = { binding: "fixture", unrelated: "keep" };
  const storage = {
    setItem: async (key: string, value: string) => {
      items[key] = value;
    },
    removeItem: async (key: string) => {
      delete items[key];
    },
  };
  await removeSessionBinding("binding", context, true, storage, async () => {
    throw new Error("Must not remove shared files");
  });
  let removed = false;
  await removeSessionBinding("binding", context, false, storage, async () => {
    removed = true;
  });
  assert.equal(removed, true);
  assert.deepEqual(items, { unrelated: "keep" });
});

test("reuse of a closed session name allocates a separate bridge without changing retained files", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "raycast-bridge-test-"));
  try {
    const retainedHome = await createProfileBridgeHome(root, "fixture", "same-browser");
    await writeFile(path.join(retainedHome, "peer-marker"), "fixture-only");
    const newHome = await createProfileBridgeHome(root, "fixture", "same-browser");
    assert.notEqual(newHome, retainedHome);
    await rm(newHome, { recursive: true, force: true });
    assert.equal(await readFile(path.join(retainedHome, "peer-marker"), "utf8"), "fixture-only");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("file cleanup failure cannot keep the successfully closed session name bound", async () => {
  const context = { fakeHome: "/fixture/home", socketDirectory: "/fixture/socket" };
  const items: Record<string, string> = { binding: "fixture", unrelated: "keep" };
  const storage = {
    setItem: async (key: string, value: string) => {
      items[key] = value;
    },
    removeItem: async (key: string) => {
      delete items[key];
    },
  };
  await assert.rejects(
    removeSessionBinding("binding", context, false, storage, async () => {
      assert.equal(Object.hasOwn(items, "binding"), false);
      throw new Error("Fixture cleanup failure");
    }),
    /Fixture cleanup failure/,
  );
  assert.equal(Object.hasOwn(items, "binding"), false);
  assert.equal(items.unrelated, "keep");
  assert.equal(readRetainedEnvironments(items).length, 1);
});
