import { strict as assert } from "node:assert";
import { test } from "node:test";
import { appendFileSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Store } from "../src/core/db";
import { Session, SessionTitle } from "../src/core/types";
import { Adapter } from "../src/core/adapters/types";
import { TitleSynchronizer } from "../src/core/titles";
import { ClaudeTitleSource } from "../src/core/sources/claude-titles";
import { readCodexTitles } from "../src/core/codex-desktop";
import { readClaudeTitleWindows, FocusedWindow } from "../src/core/focused-window";
import { deliverNotifications } from "../src/core/notifications";
import { DEFAULT_CONFIG } from "../src/core/config";
import { exec } from "../src/core/sqlite";
import { tempDir } from "./helpers";

const session: Session = {
  agent: "claude",
  sessionId: "one",
  host: "cli",
  title: "Original",
  cwd: "/project",
  status: "unknown",
  attention: null,
  summary: "Keep summary",
  locator: {},
  subscribed: true,
  handledAt: 50,
  startedAt: 10,
  updatedAt: 20,
  transcriptPath: "",
};
const observation = (title: string, observedAt: number, agent = "claude"): SessionTitle => ({
  agent,
  sessionId: "one",
  title,
  observedAt,
  source: "test",
});
const adapter = (id: string, titles: NonNullable<NonNullable<Adapter["source"]>["titles"]>): Adapter => ({
  id,
  name: id,
  source: { titles },
  detect: () => ({ present: true, hooked: true, hosts: [] }),
  planInstall: () => ({ changes: [], notes: [] }),
  planUninstall: () => ({ changes: [], notes: [] }),
  jump: async () => ({ ok: true, method: "url" }),
});
const sourceFor = (
  windows: () => Promise<FocusedWindow[]> = async () => [],
  desktop: NonNullable<ConstructorParameters<typeof ClaudeTitleSource>[0]>["desktop"] = () => [],
) => {
  let clock = 1000;
  return new ClaudeTitleSource({ windows, desktop, now: () => ++clock });
};

test("title synchronization is independent of state, subscription, activity, handling and notifications", async (t) => {
  const store = new Store(join(tempDir(t), "db.sqlite"));
  await store.put(session);
  const before = (await store.get("claude", "one"))!;
  await store.syncTitles([observation("Renamed", 100)]);
  const after = (await store.get("claude", "one"))!;
  assert.deepEqual(after, { ...before, title: "Renamed", titleObservedAt: 100, titleSource: "test" });
  assert.deepEqual(await store.claimNotifications(), []);
  assert.equal(
    (await new Store(store.path).get("claude", "one"))!.title,
    "Renamed",
    "rename survives a process restart",
  );
  await store.syncTitles([observation("   ", 200)]);
  assert.equal((await store.get("claude", "one"))!.title, "Renamed");
});

test("concurrent title observations and state events cannot restore older names or advance state clocks", async (t) => {
  const store = new Store(join(tempDir(t), "db.sqlite"));
  await store.put(session);
  await Promise.all([
    ...[200, 500, 300, 100, 400].map((at) => new Store(store.path).syncTitles([observation(`Name ${at}`, at)])),
    store.record({ agent: "claude", sessionId: "one", type: "progress", at: 30 }),
  ]);
  await store.syncTitles([observation("Late stale name", 499)]);
  const saved = (await store.get("claude", "one"))!;
  assert.equal(saved.title, "Name 500");
  assert.equal(saved.status, "running");
  assert.equal(saved.updatedAt, 30);
  assert.equal(saved.state!.at, 30);
});

test("all views share committed titles; failures and unrelated provider IDs do not corrupt subscriptions", async (t) => {
  const store = new Store(join(tempDir(t), "db.sqlite"));
  await store.put(session);
  await store.put({ ...session, agent: "codex" });
  const rows = await store.all();
  await store.syncTitles([observation("Newer committed", 500)]);
  const sync = new TitleSynchronizer(store, () => [
    adapter("claude", async () => [
      observation("Stale", 400),
      observation("Wrong source", 600, "codex"),
      { ...observation("Unrelated", 600), sessionId: "other" },
    ]),
    adapter("codex", async () => {
      throw new Error("unavailable");
    }),
  ]);
  const visible = await sync.refresh(rows);
  assert.equal(visible.find((s) => s.agent === "claude")!.title, "Newer committed");
  assert.equal(visible.find((s) => s.agent === "codex")!.title, "Original");
  assert.equal((await store.all()).length, 2);
});

test("Claude sidecar renames override a saved prompt and survive partial or missing sidecars", async (t) => {
  const root = tempDir(t),
    path = join(root, "one.jsonl"),
    sidecar = join(root, "one", "custom-title.json");
  mkdirSync(join(root, "one"));
  writeFileSync(path, JSON.stringify({ type: "custom-title", customTitle: "Legacy", sessionId: "one" }) + "\n");
  writeFileSync(sidecar, JSON.stringify({ customTitle: "First name" }));
  const store = new Store(join(root, "db.sqlite"));
  await store.put({ ...session, transcriptPath: path });
  const source = sourceFor();
  const sync = new TitleSynchronizer(store, () => [adapter("claude", (rows) => source.read(rows))]);
  assert.equal((await sync.refresh(await store.all()))[0].title, "First name");
  writeFileSync(sidecar, JSON.stringify({ customTitle: "Renamed <project>" }));
  assert.equal((await sync.refresh(await store.all()))[0].title, "Renamed <project>");
  writeFileSync(sidecar, '{"customTitle":');
  assert.equal((await sync.refresh(await store.all()))[0].title, "Renamed <project>");
  rmSync(sidecar);
  const restarted = sourceFor();
  assert.deepEqual(
    await restarted.read(await store.all()),
    [],
    "missing sidecar must not restore an old transcript name after restart",
  );
});

test("legacy Claude rename records are found before huge output, and only complete matching records apply", async (t) => {
  const path = join(tempDir(t), "one.jsonl");
  writeFileSync(
    path,
    [
      { type: "custom-title", sessionId: "one", customTitle: "Early explicit name" },
      { type: "assistant", output: "x".repeat(3 * 1024 * 1024) },
      { type: "ai-title", sessionId: "one", title: "Generated fallback" },
      { type: "custom-title", sessionId: "other", customTitle: "Wrong session" },
    ]
      .map((entry) => JSON.stringify(entry))
      .join("\n") + "\n",
  );
  const source = sourceFor();
  const row = { ...session, transcriptPath: path };
  let result: SessionTitle[] = [];
  for (let poll = 0; poll < 5; poll++) result = await source.read([row]);
  assert.equal(result[0].title, "Early explicit name");
  appendFileSync(path, '{"type":"custom-title","sessionId":"one","customTitle":"Latest');
  assert.deepEqual(await source.read([row]), []);
  appendFileSync(path, ' name"}\n');
  assert.equal((await source.read([row]))[0].title, "Latest name");
  writeFileSync(path, JSON.stringify({ type: "custom-title", sessionId: "one", customTitle: "Rotated" }) + "\n");
  assert.equal((await source.read([row]))[0].title, "Rotated");
});

test("desktop metadata updates names, while a CLI resume retains its CLI rename authority", async (t) => {
  const root = tempDir(t),
    path = join(root, "one.jsonl");
  mkdirSync(join(root, "one"));
  writeFileSync(join(root, "one", "custom-title.json"), '{"customTitle":"CLI name"}');
  let title = "Desktop name";
  const source = sourceFor(
    async () => [],
    () => [
      {
        sessionId: "local_one",
        cliSessionId: "one",
        title,
        cwd: "",
        createdAt: 0,
        lastActivityAt: 0,
        lastFocusedAt: 0,
        isArchived: false,
      },
    ],
  );
  const app = { ...session, host: "app" as const, transcriptPath: path };
  assert.equal((await source.read([app]))[0].title, "Desktop name");
  title = "Desktop renamed";
  assert.equal((await source.read([app]))[0].title, "Desktop renamed");
  assert.equal(
    (await source.read([{ ...app, host: "cli", locator: { claudeEntrypoint: "cli" } }]))[0].title,
    "CLI name",
  );
});

test("Claude cloud names follow exact open-window IDs, including aliases, never titles or activity guesses", async (t) => {
  const store = new Store(join(tempDir(t), "db.sqlite"));
  const row = { ...session, sessionId: "session_cloud1", host: "app" as const, startedAt: 0, updatedAt: 0 };
  await store.put(row);
  let windows: FocusedWindow[] = [{ title: "First - Claude Code", url: "https://claude.ai/epitaxy/cse_cloud1" }];
  const source = sourceFor(async () => windows);
  const sync = new TitleSynchronizer(store, () => [adapter("claude", (rows) => source.read(rows))]);
  assert.equal((await sync.refresh(await store.all()))[0].title, "First");
  windows = [
    { title: "Renamed - Claude Code", url: "claude.ai/epitaxy/session_cloud1" },
    { title: "Wrong - Claude Code", url: "https://claude.ai/epitaxy/session_background" },
  ];
  assert.equal((await sync.refresh(await store.all()))[0].title, "Renamed");
  windows = [{ title: "Ignore - Claude Code", url: "https://claude.ai/chat/session_cloud1" }];
  assert.equal((await sync.refresh(await store.all()))[0].title, "Renamed");
  windows = [
    { title: "A - Claude Code", url: "https://claude.ai/epitaxy/session_cloud1" },
    { title: "B - Claude Code", url: "https://claude.ai/epitaxy/cse_cloud1" },
  ];
  assert.equal(
    (await sync.refresh(await store.all()))[0].title,
    "Renamed",
    "conflicting windows are not evidence of a unique name",
  );
  windows = [];
  const saved = (await sync.refresh(await store.all()))[0];
  assert.equal(saved.title, "Renamed");
  assert.equal(saved.status, "unknown");
  assert.equal(saved.updatedAt, 0);
  assert.equal(saved.handledAt, 50);
  assert.deepEqual(await store.claimNotifications(), []);
});

test("Codex catalog renames are persisted even when no execution events arrive", async (t) => {
  const root = tempDir(t),
    catalog = join(root, "state_50.sqlite");
  await exec(catalog, "CREATE TABLE threads(id TEXT,name TEXT); INSERT INTO threads VALUES ('one','First');");
  const store = new Store(join(root, "db.sqlite"));
  await store.put({ ...session, agent: "codex" });
  let now = 100;
  const sync = new TitleSynchronizer(store, () => [
    adapter("codex", (rows) => readCodexTitles(rows, root, () => ++now)),
  ]);
  await sync.refresh(await store.all());
  await exec(catalog, "UPDATE threads SET name='Renamed' WHERE id='one';");
  await sync.refresh(await store.all());
  assert.equal((await new Store(store.path).get("codex", "one"))!.title, "Renamed");
});

test("a queued notification uses the current title without generating another notification", async (t) => {
  const store = new Store(join(tempDir(t), "db.sqlite"));
  await store.put({ ...session, handledAt: null });
  await store.record(
    { agent: "claude", sessionId: "one", type: "needs_input", requestIds: ["q"], at: 1000 },
    { channels: ["test"] },
  );
  await store.syncTitles([observation("Renamed after question", 2000)]);
  const sent: string[] = [];
  await deliverNotifications(store, { ...DEFAULT_CONFIG, notificationChannels: ["test"] }, [
    {
      id: "test",
      send: async (message) => {
        sent.push(message.title);
      },
    },
  ]);
  assert.deepEqual(sent, ["Renamed after question"]);
  assert.deepEqual(await store.claimNotifications(), []);
});

test("window-title sampling treats denied access, absent apps and malformed output as unavailable", async () => {
  for (const result of [
    { ok: false, stdout: "", stderr: "AX_ACCESS_DENIED" },
    { ok: true, stdout: "[]", stderr: "" },
    { ok: true, stdout: "not-json", stderr: "" },
  ])
    assert.deepEqual(await readClaudeTitleWindows(async () => result), []);
  assert.deepEqual(
    await readClaudeTitleWindows(async () => ({
      ok: true,
      stderr: "",
      stdout: JSON.stringify([
        { title: "Valid", url: "https://claude.ai/epitaxy/session_one" },
        { title: 2, url: "bad" },
      ]),
    })),
    [{ title: "Valid", url: "https://claude.ai/epitaxy/session_one" }],
  );
});

test("large history title refreshes stay within SQLite query limits and do not import unrelated sessions", async (t) => {
  const store = new Store(join(tempDir(t), "db.sqlite"));
  await store.put(session);
  const saved = await store.syncTitles([
    ...Array.from({ length: 1100 }, (_, n) => ({ ...observation("History", 100), sessionId: `history-${n}` })),
    observation("Known session renamed", 100),
  ]);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].title, "Known session renamed");
  assert.equal((await store.all()).length, 1);
});
