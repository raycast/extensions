import test from "node:test";
import assert from "node:assert/strict";

import { extractTernWorkingDirectory } from "../src/tern";

test("ignores focused blocks in tabs that are not shown", () => {
  const sessionList = {
    sessions: [
      {
        shown: true,
        tabs: [
          { shown: false, blocks: [{ focused: true, cwd: "/tmp/hidden-tab" }] },
          { shown: true, blocks: [{ focused: true, cwd: "/tmp/shown-tab" }] },
        ],
      },
    ],
  };

  assert.equal(extractTernWorkingDirectory(sessionList), "/tmp/shown-tab");
});

test("returns the focused block of a split tab", () => {
  const sessionList = {
    sessions: [
      {
        shown: true,
        tabs: [
          {
            shown: true,
            blocks: [
              { focused: false, cwd: "/tmp/left" },
              { focused: true, cwd: "/tmp/right" },
            ],
          },
        ],
      },
    ],
  };

  assert.equal(extractTernWorkingDirectory(sessionList), "/tmp/right");
});

test("uses the shown session", () => {
  const sessionList = {
    sessions: [
      { shown: false, tabs: [{ shown: true, blocks: [{ focused: true, cwd: "/tmp/background" }] }] },
      { shown: true, tabs: [{ shown: true, blocks: [{ focused: true, cwd: "/tmp/foreground" }] }] },
    ],
  };

  assert.equal(extractTernWorkingDirectory(sessionList), "/tmp/foreground");
});

test("keeps spaces and non-ASCII characters in the working directory", () => {
  const sessionList = {
    sessions: [{ shown: true, tabs: [{ shown: true, blocks: [{ focused: true, cwd: "/tmp/tern test 目录" }] }] }],
  };

  assert.equal(extractTernWorkingDirectory(sessionList), "/tmp/tern test 目录");
});

test("throws when no session is shown", () => {
  assert.throws(
    () => extractTernWorkingDirectory({ sessions: [] }),
    /Tern did not report a focused block with a working directory/,
  );
});

test("throws when the focused block has no working directory", () => {
  const sessionList = {
    sessions: [{ shown: true, tabs: [{ shown: true, blocks: [{ focused: true, cwd: "" }] }] }],
  };

  assert.throws(
    () => extractTernWorkingDirectory(sessionList),
    /Tern did not report a focused block with a working directory/,
  );
});
