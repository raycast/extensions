import { test } from "node:test";
import assert from "node:assert/strict";
import { muse } from "../../src/lib/tabs/sources/muse.ts";
import { fromRows, rowName, type SidebarSpec } from "../../src/lib/tabs/sources/sidebar.ts";
import { app, fakePlatform } from "../fake-platform.ts";

const museApp = app("com.meta.endo", "Muse");
const row = (title: string, text = "", selected = false) => ({ title, text, selected });

test("Muse: hover suffix (date + More thread actions) is stripped from row names", async () => {
  const platform = fakePlatform({
    sidebarRows: async () => [
      row("Main chat"),
      row("Side chats"),
      row("New side chat"),
      row("Couch research Sun More thread actions", "", true),
      row("Check train times to 31st St 2:13 PM More thread actions"),
      row("Bed frame research Sep 20 More thread actions"),
      row("Muse CLI pricing 22h More thread actions"),
      row("Start a finance goal More thread actions"),
    ],
  });
  const tabs = await muse.list(museApp, platform);
  assert.deepEqual(
    tabs.map((t) => [t.title, t.active]),
    [
      ["Main chat", false],
      ["Couch research", true],
      ["Check train times to 31st St", false],
      ["Bed frame research", false],
      ["Muse CLI pricing", false],
      ["Start a finance goal", false],
    ],
  );
});

test("opening a row passes its name and the app's query", async () => {
  let opened: unknown[] = [];
  const platform = fakePlatform({
    sidebarRows: async () => [row("Couch research")],
    openSidebarRow: async (...args) => {
      opened = args;
      return true;
    },
  });
  const [tab] = await muse.list(museApp, platform);
  await muse.select(tab, platform);
  assert.equal(opened[0], "com.meta.endo");
  assert.equal(opened[2], "Couch research");
  assert.equal((opened[1] as SidebarSpec).keyboard, true);
});

test("no sidebar found: falls back to the app's windows", async () => {
  const platform = fakePlatform({
    sidebarRows: async () => [],
    windows: async () => [
      { bundleId: museApp.bundleId, windows: [{ index: 1, title: "Muse", minimized: false, tabs: [] }] },
    ],
  });
  const tabs = await muse.list(museApp, platform);
  assert.deepEqual(
    tabs.map((t) => [t.source, t.kind]),
    [["windows", "window"]],
  );
});

test("rowName without a pattern is the title", () => {
  const spec = { namePattern: undefined } as unknown as SidebarSpec;
  assert.equal(rowName(spec, "x y"), "x y");
  assert.deepEqual(
    fromRows(
      museApp,
      { ...spec, id: "s", bundleId: "b", kind: "session", container: "c", rowRole: "r", format: "plain" },
      [row("a")],
    ).length,
    1,
  );
});

test("Muse: the open chat is named by the button above the transcript", async () => {
  let suffix = "";
  const platform = fakePlatform({
    sidebarRows: async () => {
      return [row("Main chat"), row("Couch research"), row("Bed frame research")];
    },
    labelWithSuffix: async (_id, s) => {
      suffix = s;
      return "Bed frame research";
    },
  });
  const tabs = await muse.list(museApp, platform);
  assert.equal(suffix, " Open chat and side chats");
  assert.deepEqual(
    tabs.filter((t) => t.active).map((t) => t.title),
    ["Bed frame research"],
  );
});
