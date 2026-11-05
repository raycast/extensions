// The commands, tools and the Raycast module import @raycast/api, which Node
// can't load outside Raycast, so their shape is checked from source.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { COMMAND_FILE_NAMES as FILE_NAMES, COMMANDS } from "./timer.ts";

// `npm test` runs from the extension's root. (No import.meta: tsconfig's module is commonjs.)
const SRC = join(process.cwd(), "src");
const LIB = join(SRC, "lib");
const TOOLS = join(SRC, "tools");

const read = (path: string) => readFileSync(path, "utf8");
const modules = (folder: string) => readdirSync(folder).filter((name) => name.endsWith(".ts"));

for (const command of COMMANDS) {
  const file = `${FILE_NAMES[command]}.ts`;

  test(`command_${FILE_NAMES[command]}_runsItsCommandThroughRunCommand`, () => {
    const source = read(join(SRC, file));
    assert.match(source, new RegExp(`runCommand\\("${command}"[,)]`));
    assert.equal(source.includes("props.arguments.minutes"), command === "startFocus" || command === "addTime");
  });

  test(`tool_${FILE_NAMES[command]}_returnsOnlyWhatRunToolReturns`, () => {
    const source = read(join(TOOLS, file));
    assert.match(source, new RegExp(`return runTool\\("${command}"[,)]`));
    assert.equal(source.match(/\breturn\b/g)?.length, 1);
  });
}

test("sources_exactlyTheSixCommandsAndTools", () => {
  const names = COMMANDS.map((command) => `${FILE_NAMES[command]}.ts`).sort();
  assert.deepEqual(
    modules(SRC)
      .filter((name) => name !== "moment.ts")
      .sort(),
    names,
  );
  assert.deepEqual(modules(TOOLS).sort(), names);
});

// FF-1318 (the Store's review): a tool that changes something asks first.
test("tools_everyToolThatChangesTheTimer_confirmsAndTimeLeftDoesnt", () => {
  const confirming = modules(TOOLS).filter((name) => read(join(TOOLS, name)).includes("export const confirmation"));
  const changing = COMMANDS.filter((command) => command !== "checkTimer").map((command) => `${FILE_NAMES[command]}.ts`);
  assert.deepEqual(confirming.sort(), changing.sort());
});

test("tools_onlyStopTimer_confirmsAsDestructive", () => {
  const destructive = modules(TOOLS).filter((name) => read(join(TOOLS, name)).includes("Action.Style.Destructive"));
  assert.deepEqual(destructive, ["stop-timer.ts"]);
});

test("lib_noModule_importsRaycastOrRunsAProcess", () => {
  for (const name of modules(LIB).filter((file) => !file.endsWith(".test.ts"))) {
    const source = read(join(LIB, name));
    assert.doesNotMatch(source, /from "@raycast\//, name);
    assert.doesNotMatch(source, /child_process/, name);
  }
});

test("sources_onlyTheMomentModule_runsAppleScript", () => {
  const files = [...modules(SRC).map((name) => join(SRC, name)), ...modules(TOOLS).map((name) => join(TOOLS, name))];
  const running = files.filter((path) => /@raycast\/utils|runAppleScript/.test(read(path)));
  assert.deepEqual(running, [join(SRC, "moment.ts")]);
});

test("moment_runCommandAndRunTool_areOnlyTheTestedOnesWiredToRaycast", () => {
  const source = read(join(SRC, "moment.ts"));
  assert.match(
    source,
    /export async function runCommand\([^)]*\)[^{]*\{\s*return runCommandWith\(ask, feedback, command, minutesText\);\s*\}/,
  );
  assert.match(
    source,
    /export async function runTool\([^)]*\)[^{]*\{\s*return runToolWith\(ask, command, minutes\);\s*\}/,
  );
  assert.match(source, /const ask: Ask = \(command, minutes\) =>\s*askWith\(/);
  for (const name of ["toolOutput", "parseMinutes", "toolMinutes", "successLine", "failureFor", "chooseBundleId"]) {
    assert.ok(!source.includes(name), name);
  }
});

test("moment_handsOverEveryInstalledApp_soWhichMomentIsAskedStaysTested", () => {
  const source = read(join(SRC, "moment.ts"));
  assert.doesNotMatch(source, /MOMENT_BUNDLE_ID|studio\.lumi/);
});

// FF-1311 review: without parseRunning the raw output is matched as text, and
// "studio.lumi.moment" is inside "studio.lumi.moment-setapp".
test("moment_runningCheck_isReadByParseRunning_withinItsOwnTimeout", () => {
  const source = read(join(SRC, "moment.ts"));
  assert.match(
    source,
    /runAppleScript\(RUNNING_SCRIPT, bundleIds, \{\s*timeout: RUNNING_CHECK_TIMEOUT_MILLISECONDS,\s*parseOutput: parseRunning,\s*\}\)/,
  );
});

test("tools_startFocus_confirmsWithTheMinutesTheToolWillAsk", () => {
  assert.match(
    read(join(TOOLS, "start-focus.ts")),
    /confirmation: Tool\.Confirmation<Input> = async \(input\) => startConfirmation\(input\.minutes\);/,
  );
});

test("tools_addTime_confirmsWithTheMinutesTheToolWillAsk", () => {
  assert.match(
    read(join(TOOLS, "add-time.ts")),
    /confirmation: Tool\.Confirmation<Input> = async \(input\) => addTimeConfirmation\(input\.minutes\);/,
  );
});

for (const [file, line] of [
  ["pause-timer.ts", "pauseConfirmation"],
  ["resume-timer.ts", "resumeConfirmation"],
] as const) {
  test(`tools_${file.replace(".ts", "")}_confirmsWithItsLine`, () => {
    assert.match(
      read(join(TOOLS, file)),
      new RegExp(`confirmation: Tool\\.Confirmation<Record<string, never>> = async \\(\\) => ${line}\\(\\);`),
    );
  });
}
