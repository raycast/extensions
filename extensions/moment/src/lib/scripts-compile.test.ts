// macOS only: AppleScript compiles each command's script. Safe to run: the
// target is a variable and the codes are raw, so compiling never looks Moment
// up or sends it anything. The running check also runs: it only asks whether
// apps are running, which launches nothing and sends no Apple event.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { RUNNING_SCRIPT, scriptFor } from "./scripts.ts";
import { COMMANDS } from "./timer.ts";

const notMac = process.platform !== "darwin";

function assertCompiles(name: string, script: string) {
  const folder = mkdtempSync(join(tmpdir(), "moment-raycast-"));
  try {
    const source = join(folder, `${name}.applescript`);
    writeFileSync(source, script);
    assert.doesNotThrow(() =>
      execFileSync("/usr/bin/osacompile", ["-o", join(folder, `${name}.scpt`), source], {
        stdio: "pipe",
        timeout: 20_000,
      }),
    );
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
}

for (const command of COMMANDS) {
  test(`scriptFor_${command}_compiles`, { skip: notMac }, () => {
    assertCompiles(command, scriptFor(command));
  });
}

test("runningScript_compiles", { skip: notMac }, () => {
  assertCompiles("running", RUNNING_SCRIPT);
});

/** What the running check prints for these bundle ids, run as runAppleScript runs it: the script on stdin, the ids as argv. */
function runningCheck(bundleIds: string[]): string {
  return execFileSync("/usr/bin/osascript", ["-", ...bundleIds], {
    input: RUNNING_SCRIPT,
    encoding: "utf8",
    timeout: 20_000,
  }).replace(/\n$/, "");
}

// Bundle ids no Mac has: AppleScript raises -1728 for each.
const NOWHERE = ["studio.lumi.moment-nowhere", "studio.lumi.moment-nowhere-either"];

test("runningScript_onlyIdsNoMacHas_printsNothingAndDoesNotFail", { skip: notMac }, () => {
  assert.equal(runningCheck(NOWHERE), "");
});

test("runningScript_withTheFinderAndTheDockRunning_printsJustThoseInArgvsOrder", { skip: notMac }, () => {
  const [first, second] = NOWHERE;
  assert.equal(runningCheck([first, "com.apple.dock", second, "com.apple.finder"]), "com.apple.dock\tcom.apple.finder");
});
