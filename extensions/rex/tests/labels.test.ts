import assert from "node:assert/strict";
import { test } from "node:test";
import { blockTitle, shortPath, windowTitle } from "../src/rex/labels";
import { hostKey, type RexBlock, type RexWindow } from "../src/rex/types";

function block(fields: Partial<RexBlock>): RexBlock {
  return { blockId: "block-0001a2", label: "", flavor: "", status: [], ...fields };
}

function tab(label: string, blocks: RexBlock[], focusedBlockId?: string): RexWindow {
  return { windowId: "window-00f3c9", label, active: false, focusedBlockId, blocks };
}

test("abbreviates the home directory only where it ends at a path separator", () => {
  assert.equal(shortPath("/Users/michal", "/Users/michal"), "~");
  assert.equal(shortPath("/Users/michal/w/rex", "/Users/michal"), "~/w/rex");
  assert.equal(shortPath("/Users/michal2/w/rex", "/Users/michal"), "/Users/michal2/w/rex");
});

test("pane titles fall back from the terminal title to the directory, label, and short ID", () => {
  assert.equal(blockTitle(block({ title: "vim", process: { cwd: "/tmp" } })), "vim");
  assert.equal(blockTitle(block({ process: { cwd: "/Users/michal/w/rex" } })), "rex");
  assert.equal(blockTitle(block({ process: { cwd: "/" } })), "/");
  assert.equal(blockTitle(block({ label: "logs" })), "logs");
  assert.equal(blockTitle(block({})), "0001a2");
});

test("empty or generated tab labels show the focused pane instead", () => {
  const shell = block({ blockId: "a", process: { name: "zsh", cwd: "/Users/michal/w/rex" } });
  const agent = block({ blockId: "b", title: "Claude Code" });
  assert.equal(windowTitle(tab("Window 0a1b2c3d", [shell, agent], "b")), "Claude Code");
  assert.equal(windowTitle(tab("", [shell, agent])), "rex");
  assert.equal(windowTitle(tab("Deploy", [shell, agent], "b")), "Deploy");
  assert.equal(windowTitle(tab("", [])), "00f3c9");
});

test("host identity is the exact connection target", () => {
  const remote = (label: string) => hostKey({ label, thisMachine: false });
  assert.notEqual(remote("Mini"), remote("mini"));
  assert.notEqual(remote("local"), hostKey({ label: "", thisMachine: true }));
  assert.equal(remote("mini"), hostKey({ label: "", endpoint: "mini", thisMachine: false }));
});
