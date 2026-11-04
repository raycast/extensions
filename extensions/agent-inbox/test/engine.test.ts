import { strict as assert } from "node:assert";
import { test } from "node:test";
import { join } from "node:path";
import { Store } from "../src/core/db";
import { EventEngine } from "../src/core/engine";
import { DEFAULT_CONFIG } from "../src/core/config";
import { deliverNotifications, NotificationChannel } from "../src/core/notifications";
import { exec } from "../src/core/sqlite";
import { collectorPlist } from "../src/core/service";
import { tempDir } from "./helpers";

const base = { agent: "dsh", sessionId: "s" };

test("concurrent writers preserve every pending request and deduplicate event identities", async (t) => {
  const path = join(tempDir(t), "db.sqlite");
  const store = new Store(path);
  await store.record({ ...base, type: "progress", at: 1 });
  await store.setSubscribed(base.agent, base.sessionId, true);
  await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      new Store(path).record({ ...base, type: "needs_input", attention: "question", requestIds: [`q${i}`], at: 2, eventId: `e${i}` }),
    ),
  );
  let session = (await store.get(base.agent, base.sessionId))!;
  assert.equal(session.state!.pending.length, 10);
  assert.equal(session.subscribed, true);
  const revision = session.revision;
  await store.record({ ...base, type: "needs_input", requestIds: ["q0"], at: 3, eventId: "e0" });
  session = (await store.get(base.agent, base.sessionId))!;
  assert.equal(session.revision, revision);
  await store.record({ ...base, type: "stopped", at: 1 });
  assert.equal((await store.get(base.agent, base.sessionId))!.status, "needs_input");
});

test("source events enqueue independent channels; failures retry with the same message identity", async (t) => {
  const store = new Store(join(tempDir(t), "db.sqlite"));
  const config = { ...DEFAULT_CONFIG, notificationChannels: ["mock-feishu", "mock-local"] };
  const engine = new EventEngine(store, () => config);
  await engine.ingest({ ...base, type: "progress", at: 1 });
  await store.setSubscribed(base.agent, base.sessionId, true);
  await engine.ingest({ ...base, type: "needs_input", attention: "question", requestIds: ["q"], at: 2, eventId: "ask" });
  const sent: string[] = [],
    attempts: string[] = [];
  const channels: NotificationChannel[] = [
    {
      id: "mock-local",
      async send(message) {
        sent.push(message.id);
      },
    },
    {
      id: "mock-feishu",
      async send(message) {
        attempts.push(message.id);
        if (attempts.length === 1) throw new Error("offline");
      },
    },
  ];
  await deliverNotifications(store, config, channels, 1000);
  assert.equal(sent.length, 1);
  assert.equal(attempts.length, 1);
  await deliverNotifications(store, config, channels, 1500);
  assert.equal(attempts.length, 1);
  await deliverNotifications(store, config, channels, 2000);
  assert.equal(attempts.length, 2);
  assert.equal(attempts[0], attempts[1]);
  assert.equal(sent.length, 1);
  assert.deepEqual(await store.claimNotifications(10000), []);
});

test("unsubscribed, handled or answered sessions cancel queued deliveries", async (t) => {
  for (const action of ["unsubscribe", "handle", "answer", "disable"] as const) {
    const store = new Store(join(tempDir(t), "db.sqlite"));
    const config = { ...DEFAULT_CONFIG, notificationChannels: ["fake"] };
    const engine = new EventEngine(store, () => config);
    await engine.ingest({ ...base, type: "progress", at: 1 });
    await store.setSubscribed(base.agent, base.sessionId, true);
    await engine.ingest({ ...base, type: "needs_input", requestIds: ["q"], at: 2 });
    if (action === "unsubscribe") await store.setSubscribed(base.agent, base.sessionId, false);
    if (action === "handle") await store.markHandled(base.agent, base.sessionId);
    if (action === "answer") await engine.ingest({ ...base, type: "resolved", requestIds: ["q"], at: 3 });
    if (action === "disable") config.notifications = false;
    await deliverNotifications(store, config, [
      {
        id: "fake",
        async send() {
          assert.fail(action);
        },
      },
    ]);
    assert.deepEqual(await store.claimNotifications(), []);
  }
});

test("legacy inferred done migrates to ready without changing subscriptions or archived handling", async (t) => {
  const path = join(tempDir(t), "db.sqlite");
  await exec(
    path,
    "CREATE TABLE sessions (agent TEXT,session_id TEXT,host TEXT,title TEXT,cwd TEXT,status TEXT,attention TEXT,summary TEXT,locator TEXT,subscribed INTEGER,handled_at INTEGER,started_at INTEGER,updated_at INTEGER,transcript_path TEXT,PRIMARY KEY(agent,session_id)); INSERT INTO sessions VALUES ('codex','s','app','','','done',NULL,'','{}',1,123,1,2,'');",
  );
  const session = (await new Store(path).get("codex", "s"))!;
  assert.equal(session.status, "ready");
  assert.equal(session.handledAt, 123);
  assert.equal(session.subscribed, true);
});

test("collector launch definition keeps paths as arguments and escapes plist values", () => {
  const plist = collectorPlist("/path with spaces/node", "/cli&name.mjs", "/sessions", { CODEX_HOME: "/codex<custom>" });
  assert.ok(plist.includes("<string>/path with spaces/node</string>"));
  assert.ok(plist.includes("/cli&amp;name.mjs"));
  assert.ok(plist.includes("/codex&lt;custom&gt;"));
  assert.ok(plist.includes("<string>watch</string>"));
});
