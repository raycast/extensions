import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { test } from "node:test";

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
let calendarList = [];
let calendarListError;
const exports = {};
vm.runInNewContext(
  ts.transpileModule(read("src/lib/schedule.ts"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  { exports, require: () => ({ listCalendars: async () => {
    if (calendarListError) throw calendarListError;
    return calendarList;
  } }), URL, Date },
);
const { accountAwareGoogleCalendarUrl } = exports;

for (const account of ["main@example.com", "lime@example.com"]) {
  for (const target of ["single-event", "recurring-instance_20260913T100000Z"]) {
    test(`Preserves exact ${target} and selects ${account}`, () => {
      const event = {
        htmlLink: `https://calendar.google.com/calendar/u/0/r/eventedit?eid=${target}&authuser=0&ctz=Europe%2FLondon#details`,
        start: { dateTime: "2026-09-13T10:00:00Z" },
      };
      const result = new URL(accountAwareGoogleCalendarUrl(event, account));
      assert.equal(result.pathname, "/calendar/r/eventedit");
      assert.equal(result.searchParams.get("eid"), target);
      assert.equal(result.searchParams.get("authuser"), account);
      assert.equal(result.searchParams.get("ctz"), "Europe/London");
      assert.equal(result.hash, "#details");
    });
  }
}

test("Legacy Google event links retain their event target", () => {
  const result = new URL(accountAwareGoogleCalendarUrl({
    htmlLink: "https://www.google.com/calendar/event?eid=encoded%2Btarget%3D",
    start: { date: "2026-09-13" },
  }, "lime@example.com"));
  assert.equal(result.searchParams.get("eid"), "encoded+target=");
  assert.equal(result.searchParams.get("authuser"), "lime@example.com");
});

test("Missing event links keep the account-aware day fallback", () => {
  const result = new URL(accountAwareGoogleCalendarUrl({ start: { date: "2026-09-13" } }, "lime@example.com"));
  assert.equal(result.pathname, "/calendar/r/day/2026/09/13");
  assert.equal(result.searchParams.get("authuser"), "lime@example.com");
});

// Inspect JSX structurally: every exact-event action must use the browser.
// This catches either Schedule row regressing, as well as Edit Event and Event Actions.
for (const [file, count] of [["src/schedule.tsx", 2], ["src/edit-event.tsx", 1], ["src/event-actions.tsx", 1]]) {
  test(`${file}: event actions use browser routing`, () => {
    const source = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const actions = [];
    function visit(node) {
      if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(source).startsWith("Action.")) {
        const title = node.attributes.properties.find((p) => ts.isJsxAttribute(p) && p.name.text === "title");
        if (title?.initializer && ts.isStringLiteral(title.initializer) && title.initializer.text === "Open in Google Calendar") actions.push(node);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
    assert.equal(actions.length, count);
    for (const action of actions) {
      assert.equal(action.tagName.getText(source), "Action.OpenInBrowser");
      assert.ok(action.attributes.properties.some((p) => p.name?.text === "url"));
      assert.ok(!action.attributes.properties.some((p) => p.name?.text === "application"));
    }
  });
}

test("Both Open Calendar entries use account-aware browser routing", () => {
  const source = read("src/menu-bar.tsx");
  assert.match(source, /onAction=\{\(\) => open\(calendarEventBrowserUrl\(item\)\)\}/);
  assert.equal((source.match(/onAction=\{openCalendarInBrowser\}/g) || []).length, 2);
  assert.match(source, /await open\(await connectedGoogleCalendarViewUrl\(\)\)/);
  assert.ok(!source.includes("calendarApp"));
  const pkg = JSON.parse(read("package.json"));
  assert.ok(!pkg.preferences.some((p) => p.name === "calendarApp"));
});

test("Calendar view resolves the current account without any visible events", async () => {
  for (const account of ["main@example.com", "lime@example.com"]) {
    calendarList = [
      { id: "shared@example.com", selected: true },
      { id: account, primary: true, selected: false },
    ];
    const result = new URL(await exports.connectedGoogleCalendarViewUrl());
    assert.equal(result.pathname, "/calendar/r");
    assert.equal(result.searchParams.get("authuser"), account);
    assert.equal(result.searchParams.size, 1);
    assert.equal(result.hash, "");
  }
});

test("Unresolved accounts and connection failures never fall back to the main account", async () => {
  calendarList = [{ id: "shared@example.com" }];
  await assert.rejects(exports.connectedGoogleCalendarViewUrl(), /Could not identify/);
  calendarListError = new Error("Connection unavailable");
  try {
    await assert.rejects(exports.connectedGoogleCalendarViewUrl(), /Connection unavailable/);
  } finally {
    calendarListError = undefined;
  }
});
