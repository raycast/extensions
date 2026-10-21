import { test } from "node:test";
import assert from "node:assert/strict";
import { isMissingTarget, logMarkdown, parsePanes, parseWindows, tailLog, truncateStart, fitLog } from "./tmux.ts";

// One line as printed by `tmux list-windows -a -F LIST_FORMAT`.
const row = (...fields: string[]) => fields.join("\t") + "\n";

test("parseWindows: running window", () => {
  const out = row("proj", "/Users/x/proj", "1", "@1", "backend", "0", "");
  assert.deepEqual(parseWindows(out), [
    {
      project: "proj",
      projectPath: "/Users/x/proj",
      index: 1,
      windowId: "@1",
      name: "backend",
      status: "running",
      exitCode: null,
    },
  ]);
});

test("parseWindows: exited window with exit code", () => {
  const [svc] = parseWindows(row("proj", "/p", "0", "@0", "migrate", "1", "2"));
  assert.equal(svc.status, "exited");
  assert.equal(svc.exitCode, 2);
});

test("parseWindows: window killed by a signal has no exit code", () => {
  const [svc] = parseWindows(row("proj", "/p", "0", "@0", "server", "1", ""));
  assert.equal(svc.status, "exited");
  assert.equal(svc.exitCode, null);
});

test("parseWindows: empty output gives an empty list", () => {
  assert.deepEqual(parseWindows(""), []);
});

test("tailLog: drops trailing empty lines", () => {
  assert.equal(tailLog("a\nb\n\n\n\n", 10), "a\nb");
});

test("tailLog: keeps only the last N lines", () => {
  assert.equal(tailLog("1\n2\n3\n4\n5\n", 2), "4\n5");
});

test("logMarkdown: wraps the log in a code block and defuses backtick fences", () => {
  assert.equal(logMarkdown("x\n```\ny"), "```\nx\n`​``\ny\n```");
});

test("parseWindows: a line without tab separators throws instead of yielding undefined fields", () => {
  // This is tmux output without a UTF-8 locale: tabs become "_".
  assert.throws(() => parseWindows("proj_/p_0_@0_server_0_\n"), /unexpected tmux output/);
});

test("isMissingTarget: recognizes make 3.81 and make 4 quoting", () => {
  assert.equal(isMissingTarget("make: *** No rule to make target `dev-stop'.  Stop.\n", "dev-stop"), true);
  assert.equal(isMissingTarget("make: *** No rule to make target 'dev-stop'.  Stop.\n", "dev-stop"), true);
});

test("isMissingTarget: a missing prerequisite of the target is a real failure", () => {
  assert.equal(
    isMissingTarget("make: *** No rule to make target `infra', needed by `dev-stop'.  Stop.\n", "dev-stop"),
    false,
  );
});

test("isMissingTarget: ignores prefix matches and treats special characters literally", () => {
  assert.equal(isMissingTarget("make: *** No rule to make target `dev-stop-all'.  Stop.\n", "dev-stop"), false);
  assert.equal(isMissingTarget("make: *** No rule to make target `devXstop'.  Stop.\n", "dev.stop"), false);
});

test("parsePanes: exited pane has no PID (tmux reports empty, not 0)", () => {
  // Number("") would be 0, and process.kill(-0) would hit our own process group (Raycast).
  assert.deepEqual(parsePanes("\t1\n123\t0\n"), [
    { pid: null, dead: true },
    { pid: 123, dead: false },
  ]);
});

test("truncateStart: keeps text that fits", () => {
  assert.equal(truncateStart("~/code/shop", 11), "~/code/shop");
});

test("truncateStart: replaces the start with an ellipsis and fills the width", () => {
  assert.equal(truncateStart("~/CodingProjects/acme-shop", 12), "…s/acme-shop");
  assert.equal(truncateStart("~/CodingProjects/acme-shop", 12).length, 12);
});

test("truncateStart: no room at all gives just the ellipsis", () => {
  assert.equal(truncateStart("~/code/shop", 1), "…");
  assert.equal(truncateStart("~/code/shop", 0), "");
});

test("fitLog: keeps only the newest lines that fit the height", () => {
  assert.equal(fitLog("1\n2\n3\n4\n5", 3, 80), "3\n4\n5");
});

test("fitLog: cuts lines longer than the width with an ellipsis", () => {
  assert.equal(fitLog("short\nabcdefghij", 5, 6), "short\nabcde…");
});

test("fitLog: a long line still takes exactly one row", () => {
  assert.equal(fitLog("a\nb\nxxxxxxxxxxxxxxxx", 2, 4), "b\nxxx…");
});
