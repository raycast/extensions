// Copied from badge-count-raycast test/config.test.ts on 2026-09-30, unchanged except this header and import paths
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  addApp,
  availableApps,
  moveApp,
  parseSelection,
  removeApp,
  seedSelection,
  serializeSelection,
} from "../../src/lib/badge/config.ts";
import type { InstalledApp, SelectedApp } from "../../src/lib/badge/config.ts";

function app(bundleId: string, name: string): SelectedApp {
  return { bundleId, path: `/Applications/${name}.app`, name };
}

const A = app("com.example.a", "Alpha");
const B = app("com.example.b", "Bravo");
const C = app("com.example.c", "Charlie");
const ids = (apps: SelectedApp[]) => apps.map((entry) => entry.bundleId);

describe("addApp (C1)", () => {
  it("appends a new app at the end", () => {
    assert.deepEqual(ids(addApp([A, B], C)), [A.bundleId, B.bundleId, C.bundleId]);
  });

  it("ignores duplicates by bundleId, even with a different path or name", () => {
    const list = [A, B];
    const result = addApp(list, { bundleId: A.bundleId, path: "/elsewhere/Alpha.app", name: "Alpha 2" });
    assert.equal(result, list);
  });

  it("ignores apps without a bundleId", () => {
    const list = [A];
    assert.equal(addApp(list, { path: "/Applications/NoId.app", name: "NoId" }), list);
    assert.equal(addApp(list, { bundleId: "", path: "/Applications/Empty.app", name: "Empty" }), list);
  });

  it("does not mutate the input", () => {
    const list = [A];
    addApp(list, B);
    assert.deepEqual(list, [A]);
  });
});

describe("removeApp (C1)", () => {
  it("removes the matching app and keeps the order of the rest", () => {
    assert.deepEqual(ids(removeApp([A, B, C], B.bundleId)), [A.bundleId, C.bundleId]);
  });

  it("returns an equal list for an unknown id", () => {
    assert.deepEqual(removeApp([A, B], "com.example.none"), [A, B]);
  });

  it("can remove the last app, leaving an empty selection", () => {
    assert.deepEqual(removeApp([A], A.bundleId), []);
  });
});

describe("moveApp (C1)", () => {
  it("moves up", () => {
    assert.deepEqual(ids(moveApp([A, B, C], C.bundleId, "up")), [A.bundleId, C.bundleId, B.bundleId]);
  });

  it("moves down", () => {
    assert.deepEqual(ids(moveApp([A, B, C], A.bundleId, "down")), [B.bundleId, A.bundleId, C.bundleId]);
  });

  it("moving the first app up returns the same array", () => {
    const list = [A, B, C];
    assert.equal(moveApp(list, A.bundleId, "up"), list);
  });

  it("moving the last app down returns the same array", () => {
    const list = [A, B, C];
    assert.equal(moveApp(list, C.bundleId, "down"), list);
  });

  it("returns the same array for an unknown id", () => {
    const list = [A, B, C];
    assert.equal(moveApp(list, "com.example.none", "up"), list);
    assert.equal(moveApp(list, "com.example.none", "down"), list);
  });

  it("does not mutate the input", () => {
    const list = [A, B, C];
    moveApp(list, B.bundleId, "up");
    assert.deepEqual(ids(list), [A.bundleId, B.bundleId, C.bundleId]);
  });
});

describe("availableApps (C1)", () => {
  it("excludes selected apps", () => {
    const installed: InstalledApp[] = [A, B, C];
    assert.deepEqual(ids(availableApps(installed, [B])), [A.bundleId, C.bundleId]);
  });

  it("dedupes by bundleId", () => {
    const installed: InstalledApp[] = [A, { ...A, path: "/Users/me/Applications/Alpha.app" }, B];
    assert.deepEqual(ids(availableApps(installed, [])), [A.bundleId, B.bundleId]);
  });

  it("sorts by name", () => {
    const installed: InstalledApp[] = [C, A, B];
    assert.deepEqual(
      availableApps(installed, []).map((entry) => entry.name),
      ["Alpha", "Bravo", "Charlie"],
    );
  });

  it("skips apps without a bundleId", () => {
    const installed: InstalledApp[] = [A, { path: "/Applications/NoId.app", name: "NoId" }];
    assert.deepEqual(ids(availableApps(installed, [])), [A.bundleId]);
  });
});

describe("parseSelection (C1)", () => {
  it("treats undefined as missing", () => {
    assert.deepEqual(parseSelection(undefined), { status: "missing" });
  });

  it("treats a non-string value as corrupt", () => {
    for (const raw of [42, true, null, {}, []]) {
      assert.deepEqual(parseSelection(raw), { status: "corrupt" });
    }
  });

  it("treats invalid JSON as corrupt", () => {
    assert.deepEqual(parseSelection("{not json"), { status: "corrupt" });
    assert.deepEqual(parseSelection(""), { status: "corrupt" });
  });

  it("treats a non-array JSON value as corrupt", () => {
    assert.deepEqual(parseSelection('{"bundleId":"a"}'), { status: "corrupt" });
    assert.deepEqual(parseSelection('"text"'), { status: "corrupt" });
    assert.deepEqual(parseSelection("null"), { status: "corrupt" });
  });

  it("treats an entry with a missing or mistyped field as corrupt", () => {
    for (const entry of [
      { path: "/a", name: "A" },
      { bundleId: "a", name: "A" },
      { bundleId: "a", path: "/a" },
      { bundleId: "", path: "/a", name: "A" },
      { bundleId: 1, path: "/a", name: "A" },
    ]) {
      assert.deepEqual(parseSelection(JSON.stringify([entry])), { status: "corrupt" });
    }
    assert.deepEqual(parseSelection("[1]"), { status: "corrupt" });
    assert.deepEqual(parseSelection("[null]"), { status: "corrupt" });
  });

  it("treats an empty array as an ok, deliberate empty selection", () => {
    assert.deepEqual(parseSelection("[]"), { status: "ok", apps: [] });
  });

  it("keeps the first of duplicate bundleIds", () => {
    const raw = JSON.stringify([A, B, { ...A, name: "Alpha Again" }]);
    assert.deepEqual(parseSelection(raw), { status: "ok", apps: [A, B] });
  });
});

describe("serializeSelection (C1)", () => {
  it("round-trips through parseSelection", () => {
    const apps = [A, B, C];
    assert.deepEqual(parseSelection(serializeSelection(apps)), { status: "ok", apps });
  });

  it("round-trips an empty selection", () => {
    assert.deepEqual(parseSelection(serializeSelection([])), { status: "ok", apps: [] });
  });

  it("stores only bundleId, path and name", () => {
    const extra = { ...A, badge: "3" } as SelectedApp;
    const stored = JSON.parse(serializeSelection([extra])) as Record<string, unknown>[];
    assert.deepEqual(Object.keys(stored[0]).sort(), ["bundleId", "name", "path"]);
  });
});

describe("seedSelection (C6)", () => {
  const reminders = app("com.apple.reminders", "Reminders");
  const mail = app("com.apple.mail", "Mail");
  const whatsapp = app("net.whatsapp.WhatsApp", "WhatsApp");
  const calendar = app("com.apple.iCal", "Calendar");
  const slack = app("com.tinyspeck.slackmacgap", "Slack");
  const discord = app("com.hnc.Discord", "Discord");
  const teams = app("com.microsoft.teams2", "Microsoft Teams");
  const claude = app("com.anthropic.claudefordesktop", "Claude");
  const chatgpt = app("com.openai.codex", "ChatGPT");
  const unrelated: InstalledApp[] = [
    app("com.apple.Safari", "Safari"),
    app("com.apple.Notes", "Notes"),
    { path: "/Applications/NoId.app", name: "NoId" },
  ];
  const names = (apps: SelectedApp[]) => apps.map((entry) => entry.name);

  it("returns the seven default apps in section 4 order and excludes Claude and ChatGPT", () => {
    const installed: InstalledApp[] = [
      chatgpt,
      unrelated[0],
      slack,
      claude,
      calendar,
      unrelated[2],
      teams,
      mail,
      unrelated[1],
      discord,
      reminders,
      whatsapp,
    ];
    const result = seedSelection(installed);
    assert.deepEqual(names(result), [
      "Reminders",
      "Mail",
      "WhatsApp",
      "Calendar",
      "Slack",
      "Discord",
      "Microsoft Teams",
    ]);
    assert.deepEqual(result, [reminders, mail, whatsapp, calendar, slack, discord, teams]);
  });

  it("returns only the installed candidates, in order", () => {
    const result = seedSelection([discord, unrelated[0], mail, claude, reminders]);
    assert.deepEqual(names(result), ["Reminders", "Mail", "Discord"]);
  });

  it("returns an empty list when no candidate is installed", () => {
    assert.deepEqual(seedSelection([claude, chatgpt, ...unrelated]), []);
    assert.deepEqual(seedSelection([]), []);
  });

  it("resolves Teams through the older com.microsoft.teams bundle ID", () => {
    const oldTeams = app("com.microsoft.teams", "Microsoft Teams (work or school)");
    assert.deepEqual(seedSelection([oldTeams, mail]), [mail, oldTeams]);
  });

  it("prefers com.microsoft.teams2 when both Teams versions are installed", () => {
    const oldTeams = app("com.microsoft.teams", "Microsoft Teams classic");
    assert.deepEqual(seedSelection([oldTeams, teams]), [teams]);
  });
});
