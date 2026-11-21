import { test } from "node:test";
import assert from "node:assert/strict";
import { roleOf, smartPlan, type Arrangeable, type Role } from "./roles.ts";

const big = { index: 0, width: 2560, height: 1440 };
const small = { index: 1, width: 1512, height: 950 };
const win = (id: string, role: Role, display = 0, focused = false): Arrangeable => ({
  id,
  app: id,
  display,
  focused,
  role,
});

test("roles come from the app's category, with well-known apps corrected", () => {
  assert.equal(roleOf({ bundleId: "com.todesktop.x", category: "public.app-category.developer-tools" }), "work");
  assert.equal(roleOf({ bundleId: "com.spotify.client", category: "public.app-category.music" }), "background");
  // Declares nothing, or something too broad or misleading
  assert.equal(roleOf({ bundleId: "company.thebrowser.dia" }), "reference");
  assert.equal(roleOf({ bundleId: "com.apple.Safari", category: "public.app-category.productivity" }), "reference");
  assert.equal(roleOf({ bundleId: "com.tinyspeck.slackmacgap", category: "public.app-category.business" }), "comms");
  assert.equal(roleOf({ bundleId: "com.apple.Terminal", category: "public.app-category.utilities" }), "work");
  // Unknown apps are tiled like any other work
  assert.equal(roleOf({ bundleId: "com.example.unknown" }), "work");
  assert.equal(roleOf({ bundleId: "com.raycast.macos", title: "Settings" }), "background");
});

test("the focused window leads the big display, and background apps go to the small one", () => {
  const plan = smartPlan(
    [
      win("music", "background"),
      win("browser", "reference", 1),
      win("editor", "work", 1, true),
      win("chat", "comms"),
      win("mail", "comms"),
      win("terminal", "work"),
      win("docs", "reference"),
    ],
    [big, small],
  );
  assert.deepEqual(plan, [
    { display: 0, layout: "master-left", windows: ["editor", "terminal", "browser", "docs", "chat"] },
    { display: 1, layout: "auto-tile", windows: ["mail", "music"] },
  ]);
});

test("a focused chat window still leads the big display", () => {
  const plan = smartPlan(
    [win("editor", "work"), win("docs", "reference"), win("chat", "comms", 1, true)],
    [big, small],
  );
  assert.equal(plan[0].windows[0], "chat");
});

test("no display sits empty while another is crowded", () => {
  // All work, nothing that belongs on the side: the small display still takes its share
  const plan = smartPlan(
    [win("a", "work", 0, true), win("b", "work"), win("c", "work"), win("d", "reference")],
    [big, small],
  );
  assert.deepEqual(plan[0].windows, ["a", "b", "c"]);
  assert.deepEqual(plan[1].windows, ["d"]);
});

test("a crowded display passes on what matters least", () => {
  const tabs = Array.from({ length: 7 }, (_, k) => win(`tab${k}`, "reference"));
  const plan = smartPlan([win("editor", "work", 0, true), ...tabs, win("music", "background")], [big, small]);
  assert.equal(plan[0].windows.length, 6);
  assert.equal(plan[0].windows[0], "editor");
  assert.equal(plan[1].windows.length, 3);
  assert.ok(plan[1].windows.includes("music"));
});

test("on one display everything is tiled in order of importance", () => {
  const plan = smartPlan([win("music", "background"), win("chat", "comms"), win("editor", "work", 0, true)], [big]);
  assert.deepEqual(plan, [{ display: 0, layout: "master-left", windows: ["editor", "chat", "music"] }]);
});

test("two windows that can't share a display aren't left on top of each other", () => {
  const wins = [
    win("editor", "work", 0, true),
    win("docs", "reference"),
    win("notes", "reference"),
    win("chatbot", "reference"),
    win("design", "work"),
    win("music", "background", 1),
    win("settings", "background", 1),
  ];
  // Music and settings are both too wide to sit side by side on the small display
  const fits = (display: number, ids: string[]) =>
    !(display === 1 && ids.includes("music") && ids.includes("settings"));
  const plan = smartPlan(wins, [big, small], fits);
  assert.equal(plan[1].windows.length, 2);
  assert.ok(!(plan[1].windows.includes("music") && plan[1].windows.includes("settings")));
  assert.equal(plan[0].windows[0], "editor");
  assert.equal(plan[0].windows.length, 5);
});
