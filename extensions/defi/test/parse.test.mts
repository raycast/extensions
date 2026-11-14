import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parseWindows, parseWorkspaces, workspaceLabel } from "../src/parse.ts";

const fixture = (name: string) => readFileSync(new URL(`fixtures/${name}`, import.meta.url), "utf8");

test("parses list-windows --json in the order received", () => {
  const windows = parseWindows(fixture("list-windows.json"));
  assert.equal(windows.length, 12);
  assert.deepEqual(windows[1], {
    id: 2613,
    appID: "com.t3tools.t3code",
    appName: "T3 Code (Nightly)",
    title: "Window 2",
    workspace: { id: "dev", name: "dev", position: 1 },
    display: 1,
    column: 2,
    row: 1,
    floating: false,
    focused: true,
  });
});

test("parses list-workspaces --json across displays", () => {
  const workspaces = parseWorkspaces(fixture("list-workspaces.json"));
  assert.deepEqual(
    workspaces.map((workspace) => [workspace.id, workspace.display, workspace.kind, workspace.active]),
    [
      ["dev", 1, "named", true],
      ["web", 1, "named", false],
      ["dev-secondary", 1, "named", false],
      ["tools", 1, "named", false],
      ["__defi_dynamic_5", 1, "trailing", false],
    ],
  );
  assert.equal(workspaceLabel(workspaces[4]), "New Workspace");
  assert.equal(workspaceLabel({ position: 2 }), "Workspace 2");
});

test("ignores unknown fields and malformed entries", () => {
  const windows = parseWindows(
    JSON.stringify({
      version: 1,
      extra: true,
      windows: [{ id: 7, title: "T", appName: "A", future: 1 }, { title: "no id" }],
    }),
  );
  assert.deepEqual(windows, [
    {
      id: 7,
      appID: undefined,
      appName: "A",
      title: "T",
      workspace: undefined,
      display: undefined,
      column: undefined,
      row: undefined,
      floating: false,
      focused: false,
    },
  ]);
});

test("refuses an unknown format version", () => {
  assert.throws(() => parseWindows('{"version":2,"windows":[]}'), /version 2/);
  assert.throws(() => parseWorkspaces('{"version":3,"monitors":[]}'), /version 3/);
  assert.throws(() => parseWorkspaces("not json"));
});
