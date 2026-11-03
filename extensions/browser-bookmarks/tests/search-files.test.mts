import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  getSearchBookmarks,
  getSearchGroupTabs,
  getSearchPins,
  readSearchData,
  readSearchProfiles,
} from "../src/utils/searchBookmarks.ts";

const PERSONAL = "00000000-0000-0000-0000-0000000000A1";
const WORK = "9F2B6C10-7E41-4E2B-9E8A-3C5D1A0F7B22";
const FIRST_SPACE = "00000000-0000-0000-0000-000000000001";
const WORK_SPACE = "C3D4E5F6-1111-2222-3333-444455556666";

async function folder(files: Record<string, unknown>) {
  const root = await mkdtemp(join(tmpdir(), "search-browser-"));

  for (const [name, body] of Object.entries(files)) {
    await writeFile(join(root, name), JSON.stringify(body));
  }

  return root;
}

const mark = (id: string, title: string, url: string) => ({ id, title, url });
const pin = (id: string, title: string, home: string) => ({ id, title, home });

test("before profiles, the whole folder is the one profile's", async () => {
  const root = await folder({
    "bookmarks.json": [{ id: "f", title: "Bar", children: [mark("b1", "YouTube", "https://youtube.com/")] }],
    "pins.json": { [FIRST_SPACE]: [pin("p1", "Twitch", "https://twitch.tv/")] },
    "session.json": { groups: [{ id: "g", name: "Basics" }], tabs: [{ title: "Claude", url: "https://claude.ai/", groupID: "g" }] },
  });

  try {
    assert.deepEqual(await readSearchProfiles(root), []);

    const data = await readSearchData(root, "");
    assert.equal(data.keys, undefined);
    assert.deepEqual(getSearchBookmarks(data.bookmarks).map((b) => b.title), ["YouTube"]);
    assert.deepEqual(getSearchPins(data.pins, data.keys).map((b) => b.title), ["Twitch"]);
    assert.deepEqual(getSearchGroupTabs(data.sessions).map((b) => b.folder), ["Basics"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("with two profiles, each one brings its own and nothing of the other", async () => {
  const root = await folder({
    "profiles.json": [
      { id: PERSONAL, name: "Personal", home: FIRST_SPACE },
      { id: WORK, name: "Work", home: WORK_SPACE },
    ],
    "spaces.json": [
      { id: FIRST_SPACE, name: "Home" },
      { id: WORK_SPACE, name: "Clients", profile: WORK },
    ],
    "bookmarks.json": [mark("b1", "YouTube", "https://youtube.com/")],
    [`bookmarks-${WORK}.json`]: [mark("b2", "Jira", "https://jira.example/")],
    "pins.json": {
      shared: [pin("p1", "Twitch", "https://twitch.tv/")],
      [`shared:${WORK}`]: [pin("p2", "Slack", "https://slack.com/")],
      [FIRST_SPACE]: [pin("p3", "Gmail", "https://mail.google.com/")],
      [WORK_SPACE]: [pin("p4", "Figma", "https://figma.com/")],
    },
    "session.json": { groups: [{ id: "g1", name: "Basics" }], tabs: [{ title: "Claude", url: "https://claude.ai/", groupID: "g1" }] },
    [`session-${WORK_SPACE}.json`]: { groups: [{ id: "g2", name: "SRE" }], tabs: [{ title: "eBPF", url: "https://ebpf.io/", groupID: "g2" }] },
  });

  try {
    assert.deepEqual(await readSearchProfiles(root), [
      { path: PERSONAL, name: "Personal" },
      { path: WORK, name: "Work" },
    ]);

    const home = await readSearchData(root, PERSONAL);
    assert.deepEqual(getSearchBookmarks(home.bookmarks).map((b) => b.title), ["YouTube"]);
    assert.deepEqual(getSearchPins(home.pins, home.keys).map((b) => b.title), ["Twitch", "Gmail"]);
    assert.deepEqual(getSearchGroupTabs(home.sessions).map((b) => b.folder), ["Basics"]);

    const work = await readSearchData(root, WORK);
    assert.deepEqual(getSearchBookmarks(work.bookmarks).map((b) => b.title), ["Jira"]);
    assert.deepEqual(getSearchPins(work.pins, work.keys).map((b) => b.title), ["Slack", "Figma"]);
    assert.deepEqual(getSearchGroupTabs(work.sessions).map((b) => b.folder), ["SRE"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a profile whose files are not written yet reads as empty, not as an error", async () => {
  const root = await folder({
    "profiles.json": [
      { id: PERSONAL, name: "Personal", home: FIRST_SPACE },
      { id: WORK, name: "Work", home: WORK_SPACE },
    ],
    "spaces.json": [{ id: WORK_SPACE, profile: WORK }],
  });

  try {
    const work = await readSearchData(root, WORK);
    assert.deepEqual(work.bookmarks, []);
    assert.deepEqual(work.sessions, []);
    assert.deepEqual(getSearchPins(work.pins, work.keys), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a folder that is not there at all reads as empty", async () => {
  const data = await readSearchData(join(tmpdir(), "search-browser-does-not-exist"), PERSONAL);

  assert.deepEqual(data.bookmarks, []);
  assert.deepEqual(data.sessions, []);
  assert.deepEqual(data.pins, {});
});
