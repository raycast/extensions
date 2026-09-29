import assert from "node:assert/strict";
import { test } from "node:test";
import {
  coalesceProfileLaunch,
  findProfileProcessIDs,
  recoveryActionForWindowCount,
} from "../src/launch-profile-utils.ts";

test("matches only the ChatGPT process for the exact profile data directory", () => {
  const processes = [
    '111 /Applications/ChatGPT.app/Contents/MacOS/ChatGPT --user-data-dir=/Users/test/.codex-profiles/personal',
    '112 /Applications/ChatGPT.app/Contents/MacOS/ChatGPT --user-data-dir=/Users/test/.codex-profiles/personal-archive',
    '113 /Applications/ChatGPT.app/Contents/MacOS/ChatGPT --type=renderer --user-data-dir=/Users/test/.codex-profiles/personal',
    '114 /Applications/Other.app/Contents/MacOS/Other --user-data-dir=/Users/test/.codex-profiles/personal',
    'invalid /Applications/ChatGPT.app/Contents/MacOS/ChatGPT --user-data-dir=/Users/test/.codex-profiles/personal',
  ].join("\n");

  assert.deepEqual(findProfileProcessIDs(processes, "/Users/test/.codex-profiles/personal"), [111]);
});

test("chooses activation for visible windows and restart for windowless processes", () => {
  assert.equal(recoveryActionForWindowCount(1), "activate");
  assert.equal(recoveryActionForWindowCount(0), "restart");
  assert.equal(recoveryActionForWindowCount(undefined), "launch");
});

test("coalesces overlapping launches for the same profile", async () => {
  let launches = 0;
  let finishLaunch!: () => void;
  const waitForLaunch = new Promise<void>((resolve) => {
    finishLaunch = resolve;
  });
  const launch = async () => {
    launches += 1;
    await waitForLaunch;
    return "opened";
  };

  const first = coalesceProfileLaunch("personal", launch);
  const second = coalesceProfileLaunch("personal", launch);
  await Promise.resolve();
  assert.equal(launches, 1);
  finishLaunch();
  assert.deepEqual(await Promise.all([first, second]), ["opened", "opened"]);
});
