import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import assert from "node:assert/strict";
import vm from "node:vm";
import ts from "typescript";
import { test } from "node:test";

const source = fs.readFileSync(
  path.join(process.cwd(), "src", "menu-bar.tsx"),
  "utf8",
);

const checks = [];

function check(name, condition, detail) {
  checks.push({ name, condition, detail });
}

check(
  "Long rows compress metadata before titles",
  source.includes("shorterMenuRowTime(item, now)") &&
    source.includes("shorterMenuRowDate(item, now, dateStyle)"),
  "Time/date metadata are compacted before the event title is shortened.",
);

check(
  "Long titles get a final truncation fallback",
  source.includes("const maxTitleLength = Math.max(") &&
    source.includes("title: truncate(title, maxTitleLength)"),
  "Only rows that are still too long after metadata compression shorten the title.",
);

check(
  "Existing compact-row target is preserved",
  source.includes("const MENU_ROW_COMPACT_THRESHOLD = 64"),
  "The existing 64-character target remains unchanged.",
);

console.log("\nDayCal menu-row contract\n");

let failed = 0;

for (const item of checks) {
  if (item.condition) {
    console.log(`✅ ${item.name}`);
    console.log(`   ${item.detail}`);
  } else {
    failed += 1;
    console.log(`❌ ${item.name}`);
    console.log(`   ${item.detail}`);
  }
}

console.log(`\n${checks.length - failed}/${checks.length} menu-row checks passed`);

if (failed > 0) process.exit(1);

// Evaluate the actual submenu JSX with inert UI elements. Action callbacks
// dispatch to a mocked Raycast launcher; no Google mutations run in these tests.
const actionsSource = fs.readFileSync(new URL("../src/event-actions.tsx", import.meta.url), "utf8");
const ui = new Proxy({}, { get: (_, name) => String(name) });
const h = (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity).filter(Boolean) });
const conferenceUrl = (item) => item.event.hangoutLink;
const isWritable = (calendar) => ["owner", "writer"].includes(calendar.accessRole);
const compile = (text) => ts.transpileModule(text, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, jsxFactory: "h" },
}).outputText;
const actionExports = {};
vm.runInNewContext(compile(actionsSource), {
  exports: actionExports, h,
  require: (name) => {
    if (name === "@raycast/utils") return { withAccessToken: () => (component) => component };
    if (name === "@raycast/api") return { Icon: ui, Color: ui, List: ui, Action: ui, ActionPanel: "ActionPanel" };
    if (name === "react") return { useState: (value) => [value, () => {}] };
    if (name === "./lib/google") return { isWritable };
    if (name === "./lib/schedule") return { conferenceUrl };
    return {};
  },
});
const menuAst = ts.createSourceFile("menu-bar.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let submenuCallback;
function findSubmenu(node) {
  if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "map" && node.arguments[0]?.getText(menuAst).includes("<MenuBarExtra.Submenu")) {
    assert.equal(submenuCallback, undefined, "Only one event submenu renderer is expected");
    submenuCallback = node.arguments[0].getText(menuAst);
  }
  ts.forEachChild(node, findSubmenu);
}
findSubmenu(menuAst);
assert.ok(submenuCallback, "Event submenu renderer exists");
const helpers = menuAst.statements.filter((node) => ts.isFunctionDeclaration(node) &&
  ["canModifyEvent", "isGmailGeneratedEvent", "launchEventAction"].includes(node.name?.text))
  .map((node) => node.getText(menuAst)).join("\n");
const launches = [];
const renderSubmenu = vm.runInNewContext(compile(`${helpers}\nconst renderSubmenu = ${submenuCallback};\nrenderSubmenu;`), {
  h, MenuBarExtra: ui, Icon: ui, Color: ui, isWritable, conferenceUrl,
  transferModeFor: actionExports.transferModeFor,
  calendarDisplayColor: () => undefined, menuRowTitle: () => "Event",
  calendarEventBrowserUrl: () => "https://calendar.google.com/", mapsUrl: () => "", open: () => {},
  now: new Date(), menuBarRowLayout: "", menuBarDateStyle: "",
  LaunchType: { UserInitiated: "userInitiated" },
  launchCommand: async (options) => { launches.push(options); }, showHUD: async () => {},
});
const calendar = { id: "primary", summary: "Personal", accessRole: "owner" };
const event = { id: "event", summary: "Review", eventType: "default", organizer: { self: true },
  start: { dateTime: "2026-09-18T10:00:00Z" }, end: { dateTime: "2026-09-18T11:00:00Z" } };
const titles = (tree) => tree.children.filter((child) => child.type === "Item").map((child) => child.props.title);

test("Writable one-off keeps the exact menu layout and existing Move dispatch", async () => {
  const menu = renderSubmenu({ calendar, event });
  assert.deepEqual(titles(menu), ["Open Event", "Edit Event", "Move to Calendar…", "More Actions…", "Delete Event…"]);
  await menu.children.find((child) => child.props.title === "Move to Calendar…").props.onAction();
  assert.equal(launches.at(-1).name, "schedule");
  assert.equal(launches.at(-1).context.action, "move");
});

for (const recurrence of [{ recurringEventId: "series" }, { recurrence: ["RRULE:FREQ=WEEKLY"] }]) {
  test(`Writable recurring event promotes Copy without Move (${Object.keys(recurrence)[0]})`, async () => {
    const recurring = { ...event, ...recurrence };
    const menu = renderSubmenu({ calendar, event: recurring });
    assert.deepEqual(titles(menu), ["Open Event", "Edit Event", "Copy to Calendar…", "More Actions…", "Delete Event…"]);
    await menu.children.find((child) => child.props.title === "Copy to Calendar…").props.onAction();
    assert.equal(launches.at(-1).name, "schedule");
    assert.equal(launches.at(-1).context.action, "copy");
    assert.equal(launches.at(-1).context.event, recurring);
    assert.equal(launches.at(-1).context.calendar, calendar);
    await menu.children.find((child) => child.props.title === "More Actions…").props.onAction();
    assert.equal(launches.at(-1).context.hideCopyToCalendar, true);
  });
}

for (const [name, calendarPatch, eventPatch, expected] of [
  ["read-only", { accessRole: "reader" }, {}, ["Open Event", "Copy to Calendar…", "More Actions…", "Read-only Event"]],
  ["guest", {}, { organizer: { self: false } }, ["Open Event", "Copy to Calendar…", "More Actions…", "Guest Event"]],
  ["birthday", {}, { eventType: "birthday" }, ["Open Event", "More Actions…", "Read-only Event"]],
  ["special", {}, { eventType: "outOfOffice" }, ["Open Event", "Edit Event", "More Actions…", "Delete Event…"]],
  ["Gmail", {}, { eventType: "fromGmail" }, ["Open Event", "Copy to Calendar…", "More Actions…", "Delete Event…"]],
  ["meeting", {}, { hangoutLink: "https://meet.google.com/example" }, ["Open Event", "Edit Event", "Join Meeting", "More Actions…", "Delete Event…"]],
  ["location", {}, { location: "Office" }, ["Open Event", "Edit Event", "Open Location", "More Actions…", "Delete Event…"]],
]) {
  test(`${name} recurring event keeps valid actions without a filler transfer`, async () => {
    const menu = renderSubmenu({ calendar: { ...calendar, ...calendarPatch }, event: { ...event, recurringEventId: "series", ...eventPatch } });
    assert.deepEqual(titles(menu), expected);
    await menu.children.find((child) => child.props.title === "More Actions…").props.onAction();
    assert.equal(launches.at(-1).context.hideCopyToCalendar, false);
  });
}

function allTitles(tree) {
  return [tree.props?.title, ...(tree.children || []).flatMap(allTitles)].filter(Boolean);
}
test("More Actions hides only promoted Copy; default and Schedule entry points retain it", () => {
  const recurring = { ...event, recurringEventId: "series" };
  assert.ok(allTitles(actionExports.EventActionsView({ calendar, event: recurring })).includes("Copy to Calendar…"));
  assert.ok(!allTitles(actionExports.EventActionsView({ calendar, event: recurring, hideCopyToCalendar: true })).includes("Copy to Calendar…"));
  assert.ok(allTitles(actionExports.EventActionsView({ calendar, event, hideCopyToCalendar: true })).includes("Move to Calendar…"));
  const commandTree = actionExports.default({ launchContext: { calendar, event: recurring, hideCopyToCalendar: true } });
  assert.equal(commandTree.props.hideCopyToCalendar, true);
  const copyTree = actionExports.default({ launchContext: { calendar, event: recurring, action: "copy" } });
  assert.equal(copyTree.props.mode, "copy");
  assert.equal(actionExports.transferModeFor(calendar, recurring), "copy");
});
