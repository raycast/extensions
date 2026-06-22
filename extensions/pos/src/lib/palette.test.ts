import { test } from "node:test";
import assert from "node:assert/strict";
import {
  filterPalette,
  paletteCommands,
  needsArgs,
  isDestructive,
  splitArgs,
  groupByFocus,
  type PosCommand,
  type StatusRow,
} from "./palette.ts";

const CMDS: PosCommand[] = [
  {
    name: "status",
    synopsis: "Git status across projects",
    args: "[--json]",
    example: "pos status",
  },
  { name: "i", synopsis: "Interactive TUI", args: "", example: "pos i" },
  {
    name: "interactive",
    synopsis: "Interactive TUI",
    args: "",
    example: "pos interactive",
  },
  {
    name: "spread",
    synopsis: "Fan workspaces out",
    args: "",
    example: "pos spread",
  },
  {
    name: "load",
    synopsis: "Converge the workspace",
    args: "<names>",
    example: "pos load x",
  },
];

test("paletteCommands drops TTY-only commands", () => {
  const names = paletteCommands(CMDS).map((c) => c.name);
  assert.ok(!names.includes("i"));
  assert.ok(!names.includes("interactive"));
  assert.ok(names.includes("status"));
});

test("filterPalette matches name and synopsis, case-insensitive", () => {
  assert.deepEqual(
    filterPalette(CMDS, "STAT").map((c) => c.name),
    ["status"],
  );
  assert.ok(filterPalette(CMDS, "converge").some((c) => c.name === "load"));
  assert.equal(filterPalette(CMDS, "").length, CMDS.length);
});

test("needsArgs reflects the args field", () => {
  assert.equal(needsArgs(CMDS[0]), true); // status [--json]
  assert.equal(needsArgs(CMDS[3]), false); // spread
});

test("isDestructive flags load and rm only", () => {
  assert.equal(isDestructive("load"), true);
  assert.equal(isDestructive("rm"), true);
  assert.equal(isDestructive("status"), false);
});

test("splitArgs honours quotes", () => {
  assert.deepEqual(splitArgs("revenue-sprint --apply"), [
    "revenue-sprint",
    "--apply",
  ]);
  assert.deepEqual(splitArgs('"my note" x'), ["my note", "x"]);
  assert.deepEqual(splitArgs(""), []);
});

test("groupByFocus buckets rows preserving order", () => {
  const rows: StatusRow[] = [
    {
      focus: "business",
      project: "cenno",
      path: "/a",
      branch: "main",
      dirty: true,
    },
    { focus: "play", project: "seq", path: "/b", branch: "dev", dirty: false },
    {
      focus: "business",
      project: "pos",
      path: "/c",
      branch: "main",
      dirty: false,
    },
  ];
  const g = groupByFocus(rows);
  assert.deepEqual([...g.keys()], ["business", "play"]);
  assert.deepEqual(
    g.get("business")!.map((r) => r.project),
    ["cenno", "pos"],
  );
});
