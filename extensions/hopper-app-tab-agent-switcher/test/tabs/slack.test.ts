import { test } from "node:test";
import assert from "node:assert/strict";
import { groupName, openConversation, parseWorkspace, slack } from "../../src/lib/tabs/sources/slack.ts";
import type { AXWindow, BlobFields } from "../../src/lib/tabs/model.ts";
import { app, fakePlatform } from "../fake-platform.ts";

const slackApp = app("com.tinyspeck.slackmacgap", "Slack");
const win = (index: number, title: string): AXWindow => ({ index, title, minimized: false, tabs: [] });

function blob(team: string, name: string, modified: number, channels: object[], members: object = {}): BlobFields {
  return {
    path: `/blob/${team}/${modified}`,
    modified,
    fields: {
      selfTeamIds: { teamId: team },
      teams: { [team]: { id: team, name }, TOTHER: { id: "TOTHER", name: "Other" } },
      channels: Object.fromEntries(channels.map((c) => [(c as { id: string }).id, c])),
      members,
    },
  };
}

const acme = blob(
  "T1",
  "Acme",
  2000,
  [
    { id: "C2", name: "random", is_channel: true, is_member: true },
    { id: "C1", name: "general", is_channel: true, is_member: true },
    { id: "C3", name: "old", is_channel: true, is_member: true, is_archived: true },
    { id: "C4", name: "browsed", is_channel: true, is_member: false },
    { id: "G1", name: "secret", is_group: true, is_private: true, is_member: true },
    { id: "D1", name: "U1", is_im: true, is_open: true, user: "U1", is_member: true },
    { id: "D2", name: "U2", is_im: true, is_open: false, user: "U2", is_member: true },
    { id: "D3", name: "U3", is_im: true, is_open: true, user: "U3", is_member: true },
    { id: "G2", name: "mpdm-ann--bob-1", is_mpim: true, is_open: true, is_member: true },
  ],
  {
    U1: { name: "zed", real_name: "Zed Real", profile: { display_name: "" } },
    U2: { name: "closed" },
    U3: { name: "gone", deleted: true },
  },
);

test("Slack: channels the user is in, then open DMs, by name; archived, browsed, closed, deleted left out", () => {
  const workspace = parseWorkspace(acme);
  assert.equal(workspace?.name, "Acme");
  assert.deepEqual(
    workspace?.places.map((p) => [p.id, p.title]),
    [
      ["C1", "#general"],
      ["C2", "#random"],
      ["G1", "#secret"],
      ["G2", "ann, bob"],
      ["D1", "Zed Real"],
    ],
  );
});

test("Slack: blobs that aren't a workspace's state are skipped", () => {
  assert.equal(parseWorkspace({ path: "/x", modified: 1, fields: { experiments: {} } }), undefined);
  assert.equal(groupName("mpdm-ann--bob--cat-1"), "ann, bob, cat");
});

test("Slack: window titles name the open conversation and its workspace", () => {
  assert.deepEqual(openConversation("general (Channel) - Acme - Slack"), { name: "general", workspace: "Acme" });
  assert.deepEqual(openConversation("Zed Real (DM) - My - Team - Slack"), { name: "Zed Real", workspace: "My - Team" });
  assert.equal(openConversation("Slack"), undefined);
});

test("Slack: newest blob per workspace; the workspace with the open conversation first, marked active", async () => {
  const stale = blob("T1", "Acme", 1000, [{ id: "C9", name: "renamed-since", is_channel: true, is_member: true }]);
  const beta = blob("T2", "Beta", 3000, [{ id: "C5", name: "general", is_channel: true, is_member: true }]);
  const dirs: string[] = [];
  const platform = fakePlatform({
    windows: async () => [{ bundleId: slackApp.bundleId, windows: [win(1, "general (Channel) - Acme - Slack")] }],
    readIndexedDbBlobs: async (dir) => {
      dirs.push(dir);
      return [beta, stale, acme];
    },
  });
  const tabs = await slack.list(slackApp, platform);
  assert.match(dirs[0], /^\/Users\/me\/Library\/Application Support\/Slack\/IndexedDB\/https_app\.slack\.com_0/);
  assert.deepEqual(
    tabs.map((t) => [t.title, t.detail, t.active]),
    [
      ["#general", "Acme", true],
      ["#random", "Acme", false],
      ["#secret", "Acme", false],
      ["ann, bob", "Acme", false],
      ["Zed Real", "Acme", false],
      ["#general", "Beta", false],
    ],
  );
  assert.equal(new Set(tabs.map((t) => t.key)).size, tabs.length);
  assert.deepEqual(platform.reports, []);
});

test("Slack: selecting opens the conversation's deep link", async () => {
  let opened = "";
  const platform = fakePlatform({
    windows: async () => [],
    readIndexedDbBlobs: async () => [acme],
    openUrl: async (url) => {
      opened = url;
    },
  });
  const tabs = await slack.list(slackApp, platform);
  await slack.select(tabs.find((t) => t.title === "Zed Real")!, platform);
  assert.equal(opened, "slack://channel?team=T1&id=D1");
});

test("Slack: no state lists its windows; blobs without a workspace's state are reported", async () => {
  const windows = async () => [{ bundleId: slackApp.bundleId, windows: [win(1, "Slack")] }];
  const signedOut = fakePlatform({ windows });
  assert.deepEqual(
    (await slack.list(slackApp, signedOut)).map((t) => [t.title, t.source]),
    [["Slack", "windows"]],
  );
  assert.deepEqual(signedOut.reports, []);

  const changed = fakePlatform({
    windows,
    readIndexedDbBlobs: async () => [{ path: "/x", modified: 1, fields: {} }],
  });
  assert.equal((await slack.list(slackApp, changed)).length, 1);
  assert.deepEqual(
    changed.reports.map((r) => r.context),
    ["tabs: slack"],
  );
});

test("Slack: the App Store build's folder is read when the direct download's has nothing", async () => {
  const dirs: string[] = [];
  const platform = fakePlatform({
    windows: async () => [],
    readIndexedDbBlobs: async (dir) => {
      dirs.push(dir);
      return dir.includes("Containers") ? [acme] : [];
    },
  });
  assert.equal((await slack.list(slackApp, platform)).length, 5);
  assert.equal(dirs.length, 2);
});

test("Slack: with both builds' folders holding state, the most recently written one is read, not merged", async () => {
  const stale = blob("TOLD", "Old Co", 1000, [{ id: "C9", name: "legacy", is_channel: true, is_member: true }]);
  const platform = fakePlatform({
    windows: async () => [],
    readIndexedDbBlobs: async (dir) => (dir.includes("Containers") ? [acme] : [stale]),
  });
  const tabs = await slack.list(slackApp, platform);
  assert.equal(tabs.length, 5);
  assert.ok(tabs.every((t) => t.detail === "Acme"));
});
