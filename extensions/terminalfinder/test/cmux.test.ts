import test from "node:test";
import assert from "node:assert/strict";

import { extractCmuxWorkingDirectory } from "../src/cmux";

test("returns the cwd for the focused workspace", () => {
  const sidebarState = {
    workspaces: [
      { focused: false, cwd: "/tmp/other" },
      { focused: true, cwd: "/tmp/focused" },
    ],
  };

  assert.equal(extractCmuxWorkingDirectory(sidebarState), "/tmp/focused");
});

test("does not return an earlier unfocused workspace directory", () => {
  const sidebarState = {
    workspaces: [
      { active: false, workingDirectory: "/tmp/first" },
      { active: true, workingDirectory: "/tmp/second" },
    ],
  };

  assert.equal(extractCmuxWorkingDirectory(sidebarState), "/tmp/second");
});

test("supports snake_case working directory fields", () => {
  const sidebarState = {
    groups: [
      {
        selected: true,
        meta: {
          working_directory: "/tmp/snake-case",
        },
      },
    ],
  };

  assert.equal(extractCmuxWorkingDirectory(sidebarState), "/tmp/snake-case");
});

test("supports explicit focused working directory fields", () => {
  const sidebarState = {
    window: {
      focused_cwd: "/tmp/explicit",
      workspaces: [
        { focused: false, cwd: "/tmp/other" },
      ],
    },
  };

  assert.equal(extractCmuxWorkingDirectory(sidebarState), "/tmp/explicit");
});

test("throws when no focused or active workspace is present", () => {
  const sidebarState = {
    workspaces: [{ cwd: "/tmp/only" }],
  };

  assert.throws(
    () => extractCmuxWorkingDirectory(sidebarState),
    /cmux did not return a focused workspace with a working directory/,
  );
});

test("throws when the focused workspace has no working directory", () => {
  const sidebarState = {
    workspaces: [
      { focused: true, title: "missing cwd" },
      { focused: false, cwd: "/tmp/other" },
    ],
  };

  assert.throws(
    () => extractCmuxWorkingDirectory(sidebarState),
    /cmux did not return a focused workspace with a working directory/,
  );
});
