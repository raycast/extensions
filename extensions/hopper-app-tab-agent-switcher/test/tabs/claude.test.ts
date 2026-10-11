import { test } from "node:test";
import assert from "node:assert/strict";
import { claude, openConversation, parseSession, remember } from "../../src/lib/tabs/sources/claude.ts";
import { app, fakePlatform } from "../fake-platform.ts";

const claudeApp = app("com.anthropic.claudefordesktop", "Claude");
const row = (title: string, text = "", selected = false) => ({ title, text, selected });
const session = (sessionId: string, title: string, lastFocusedAt: number, extra: object = {}) => ({
  path: `/x/${sessionId}.json`,
  fields: {
    sessionId,
    title,
    cwd: "/Users/me/Projects/hopper",
    lastFocusedAt,
    isArchived: false,
    ...extra,
  } as Record<string, unknown>,
});

test("parses session files; skips archived and unexpected ones; untitled falls back to the folder", () => {
  assert.deepEqual(parseSession(session("local_1", "tabs", 5).fields), {
    sessionId: "local_1",
    title: "tabs",
    cwd: "/Users/me/Projects/hopper",
    lastFocusedAt: 5,
  });
  assert.equal(parseSession(session("local_2", "old", 1, { isArchived: true }).fields), undefined);
  assert.equal(parseSession({}), undefined);
  assert.equal(parseSession({ sessionId: "local_3", cwd: "/a/b/proj" })?.title, "proj");
});

test("Code sessions come from the files, most recently focused first, with the sidebar hidden", async () => {
  let dir = "";
  const platform = fakePlatform({
    readJsonFields: async (d) => {
      dir = d;
      return [session("local_a", "donate", 1), session("local_b", "tabs", 3), session("local_c", "main", 2)];
    },
    sidebarRows: async () => [],
    labelWithSuffix: async () => "main",
  });
  const tabs = await claude.list(claudeApp, platform);
  assert.equal(dir, "/Users/me/Library/Application Support/Claude/claude-code-sessions");
  assert.deepEqual(
    tabs.map((t) => [t.title, t.detail, t.active]),
    [
      ["tabs", "~/Projects/hopper", false],
      ["main", "~/Projects/hopper", true],
      ["donate", "~/Projects/hopper", false],
    ],
  );
});

test("sidebar rows the files don't have (Chat mode) are added; Code rows aren't repeated", async () => {
  const platform = fakePlatform({
    readJsonFields: async () => [session("local_a", "tabs", 1)],
    sidebarRows: async () => [row("Idle tabs", "tabs"), row("Idle Trip ideas", "Trip ideas")],
  });
  const tabs = await claude.list(claudeApp, platform);
  assert.deepEqual(
    tabs.map((t) => [t.title, t.ref]),
    [
      ["tabs", { sessionId: "local_a" }],
      ["Trip ideas", { name: "Trip ideas" }],
    ],
  );
});

test("selecting a Code session opens its deep link; a sidebar entry presses its row", async () => {
  const urls: string[] = [];
  const pressed: string[] = [];
  const platform = fakePlatform({
    readJsonFields: async () => [session("local_a", "tabs", 1)],
    sidebarRows: async () => [row("Idle Trip ideas", "Trip ideas")],
    openUrl: async (url) => {
      urls.push(url);
    },
    openSidebarRow: async (_id, _q, name) => {
      pressed.push(name);
      return true;
    },
  });
  const [code, chat] = await claude.list(claudeApp, platform);
  await claude.select(code, platform);
  await claude.select(chat, platform);
  assert.deepEqual(urls, ["claude://code/continue?session=local_a"]);
  assert.deepEqual(pressed, ["Trip ideas"]);
});

test("no session files and no sidebar: falls back to the app's windows", async () => {
  const platform = fakePlatform({
    sidebarRows: async () => [],
    windows: async () => [
      { bundleId: claudeApp.bundleId, windows: [{ index: 1, title: "Claude", minimized: false, tabs: [] }] },
    ],
  });
  assert.deepEqual(
    (await claude.list(claudeApp, platform)).map((t) => t.source),
    ["windows"],
  );
});

const CHAT = "chat/befa66a9-924a-4d89-bc1e-b3d43f9a18ea";
const page = (title: string, path: string) => ({ title: `${title} - Claude`, url: `https://claude.ai/${path}` });

test("openConversation: chat and Cowork pages; not Code sessions, new chats, or other pages", () => {
  assert.deepEqual(openConversation(page("Trip ideas", CHAT)), { title: "Trip ideas", path: CHAT });
  assert.deepEqual(openConversation(page("Launch post", "cowork/cse_01NWJ4vsMXKan3ddSfX5X6L1")), {
    title: "Launch post",
    path: "cowork/cse_01NWJ4vsMXKan3ddSfX5X6L1",
  });
  assert.deepEqual(openConversation(page("Trip ideas", `${CHAT}?x=1`))?.path, CHAT);
  assert.equal(openConversation(page("Claude", "epitaxy/local_54edbd37-e47c-41c3-a9a0-8917fa84b72d")), undefined);
  assert.equal(openConversation(page("New chat", "new?mode=chat")), undefined);
  assert.equal(openConversation({ title: "x", url: `https://evil.example/${CHAT}` }), undefined);
  assert.equal(openConversation(undefined), undefined);
});

test("remember: newest first, replaces the same path (renamed), keeps same-titled chats, capped at 200", () => {
  const known = Array.from({ length: 200 }, (_, i) => ({ title: `t${i}`, path: `chat/${i}`, seenAt: i }));
  const next = remember(known, { title: "t5", path: "chat/new" }, 1000);
  assert.deepEqual(next[0], { title: "t5", path: "chat/new", seenAt: 1000 });
  assert.equal(next.filter((k) => k.title === "t5").length, 2);
  const renamed = remember(known, { title: "renamed", path: "chat/5" }, 1000);
  assert.deepEqual(
    renamed.filter((k) => k.path === "chat/5"),
    [{ title: "renamed", path: "chat/5", seenAt: 1000 }],
  );
  assert.equal(next.length, 200);
  assert.equal(remember(known, { title: "fresh", path: "chat/fresh" }, 1).length, 200);
});

test("a conversation's id is learned while open; its sidebar row then opens by deep link", async () => {
  const urls: string[] = [];
  let open = page("Trip ideas", CHAT);
  const platform = fakePlatform({
    sidebarRows: async () => [row("Idle Trip ideas", "Trip ideas"), row("Idle Other", "Other")],
    webPages: async () => [open],
    openUrl: async (url) => {
      urls.push(url);
    },
  });
  await claude.list(claudeApp, platform);
  open = page("New chat", "new?mode=chat");
  const tabs = await claude.list(claudeApp, platform);
  assert.deepEqual(
    tabs.map((t) => [t.title, t.ref]),
    [
      ["Trip ideas", { path: CHAT }],
      ["Other", { name: "Other" }],
    ],
  );
  await claude.select(tabs[0], platform);
  assert.deepEqual(urls, [`claude://claude.ai/${CHAT}`]);
});

test("same-titled conversations stay apart: each row opens its own, listed or not", async () => {
  const OTHER = "chat/0b6c1c4e-7a0d-4c41-9d43-5f2f1f8c2a10";
  let rows = [row("Idle Trip", "Trip"), row("Idle Trip", "Trip")];
  const platform = fakePlatform({
    sidebarRows: async () => rows,
    loadJson: async <T>() =>
      [
        { title: "Trip", path: CHAT, seenAt: 2 },
        { title: "Trip", path: OTHER, seenAt: 1 },
      ] as T,
    webPages: async () => [page("Trip", OTHER)],
  });
  const withSidebar = await claude.list(claudeApp, platform);
  assert.deepEqual(
    withSidebar.map((t) => [t.key, t.active, t.ref]),
    [
      [`${claudeApp.bundleId}:row:Trip`, true, { path: OTHER }],
      [`${claudeApp.bundleId}:row:Trip#2`, false, { path: CHAT }],
    ],
  );
  rows = [];
  const hidden = await claude.list(claudeApp, platform);
  assert.deepEqual(
    hidden.map((t) => [t.key, t.active, t.ref]),
    [
      [`${claudeApp.bundleId}:row:Trip`, true, { path: OTHER }],
      [`${claudeApp.bundleId}:row:Trip#2`, false, { path: CHAT }],
    ],
  );
});

test("sidebar showing no conversations: known ones are listed, the open one active", async () => {
  const platform = fakePlatform({
    readJsonFields: async () => [session("local_a", "tabs", 1)],
    sidebarRows: async () => [row("Idle tabs", "tabs")],
    loadJson: async <T>() =>
      [
        { title: "Trip ideas", path: CHAT, seenAt: 2 },
        { title: "tabs", path: "chat/x", seenAt: 1 },
      ] as T,
    webPages: async () => [page("Trip ideas", CHAT)],
  });
  const tabs = await claude.list(claudeApp, platform);
  assert.deepEqual(
    tabs.map((t) => [t.title, t.active, t.ref]),
    [
      ["tabs", false, { sessionId: "local_a" }],
      ["Trip ideas", true, { path: CHAT }],
    ],
  );
});
