import assert from "node:assert/strict";
import { stat } from "node:fs/promises";
import { basename, join } from "node:path";
import test from "node:test";
import {
  captureActions,
  runCapture,
  shortcutName,
} from "../src/lib/shortcuts.ts";

test("bundled shortcut basenames match the actual imported default names", async () => {
  for (const action of Object.values(captureActions)) {
    assert.equal(basename(action.file, ".shortcut"), action.name);
    const file = await stat(
      join(process.cwd(), "assets", "shortcuts", action.file),
    );
    assert.ok(file.isFile() && file.size > 20000);
  }
});

test("capture invokes installed shortcut by exact name with separate process arguments", async () => {
  const calls: string[][] = [];
  const name = "Cleft capture $(not-a-command)";
  await runCapture("start", name, async (arguments_) => {
    calls.push(arguments_);
    return arguments_[0] === "list" ? `${name}\nOther shortcut\n` : "";
  });
  assert.deepEqual(calls, [["list"], ["run", name]]);
});

test("missing shortcuts fail before running any action", async () => {
  const calls: string[][] = [];
  await assert.rejects(
    runCapture("stop", undefined, async (arguments_) => {
      calls.push(arguments_);
      return "Unrelated shortcut\n";
    }),
    /Install/,
  );
  assert.deepEqual(calls, [["list"]]);
});

test("shortcut process failures propagate instead of reporting capture success", async () => {
  await assert.rejects(
    runCapture("continue", undefined, async (arguments_) => {
      if (arguments_[0] === "list") return "Raycast Cleft Continue Last Note\n";
      throw new Error("Cleft is not signed in");
    }),
    /not signed in/,
  );
});

test("shortcut names have explicit defaults and reject multiline inputs", () => {
  assert.equal(shortcutName("start", "  "), "Raycast Cleft Start Recording");
  assert.throws(() => shortcutName("stop", "One\nTwo"), /valid/);
});
