const assert = require("node:assert/strict");
const test = require("node:test");
const { parseLaunchConfig } = require("../.test-build/utils/launch-config-parser");
const { launchConfigToWorkspaceLayouts } = require("../.test-build/utils/launch-config-converter");
const { buildAppleScript } = require("../.test-build/utils/workspace-script");

function config(option = "") {
  return parseLaunchConfig(`
name: Codex
windows:
  - ${option}
    tabs:
      - title: Codex
        layout:
          cwd: ~/project
          commands:
            - exec: codex
      - title: Shell
        layout:
          cwd: ~/project
`);
}

function script(target) {
  return buildAppleScript({ workspaceName: "Codex", autoFocus: false, ...target });
}

test("explicit true opens a fresh window even with a matching existing session", () => {
  const [target] = launchConfigToWorkspaceLayouts(config("open_in_new_window: true"));
  assert.equal(target.layout.openInNewWindow, true);
  assert.equal(target.layout.reuseExisting, false);
  const result = script(target);
  assert.match(result, /set openInNewWindow to true/);
  assert.match(result, /if false and \(count of windows\) is not 0 then/);
  assert.match(result, /set targetWindow to new window with configuration cfg1/);
  assert.match(result, /set tab2 to new tab in targetWindow with configuration cfg2/);
  assert.match(result, /input text "codex" to tab1pane1/);
});

test("explicit false creates fresh tabs and retains the no-window fallback", () => {
  const [target] = launchConfigToWorkspaceLayouts(config("open_in_new_window: false"));
  assert.equal(target.layout.openInNewWindow, false);
  assert.equal(target.layout.reuseExisting, false);
  const result = script(target);
  assert.match(result, /set openInNewWindow to false/);
  assert.match(result, /if false and \(count of windows\) is not 0 then/);
  assert.match(result, /if openInNewWindow or \(count of windows\) is 0 then/);
  assert.match(result, /set tab1 to new tab in targetWindow with configuration cfg1/);
});

test("omitting the option preserves the first-tab and later-window defaults and reuse", () => {
  const original = config();
  original.windows.push(original.windows[0]);
  const targets = launchConfigToWorkspaceLayouts(original);
  assert.deepEqual(
    targets.map(({ layout }) => layout.openInNewWindow),
    [false, true],
  );
  for (const target of targets) {
    assert.equal(target.layout.reuseExisting, true);
    assert.match(script(target), /if true and \(count of windows\) is not 0 then/);
  }
});

test("each windows item can independently override its default", () => {
  const mixed = config("open_in_new_window: true");
  mixed.windows.push(config("open_in_new_window: false").windows[0]);
  const targets = launchConfigToWorkspaceLayouts(mixed);
  assert.deepEqual(
    targets.map(({ layout }) => layout.openInNewWindow),
    [true, false],
  );
  assert.deepEqual(
    targets.map(({ layout }) => layout.reuseExisting),
    [false, false],
  );
});

test("Git repo directory override preserves the requested opening mode", () => {
  const [target] = launchConfigToWorkspaceLayouts(config("open_in_new_window: true"), {
    directoryOverride: "/tmp/selected repo",
  });
  assert.equal(target.directory, "/tmp/selected repo");
  assert.equal(target.layout.openInNewWindow, true);
  assert.equal(target.layout.reuseExisting, false);
  assert.ok(target.layout.tabs.every((tab) => tab.workingDirectory === undefined));
  assert.match(script(target), /set initial working directory of cfg1 to "\/tmp\/selected repo"/);
});

test("quoted booleans, null, and other malformed option values are rejected", () => {
  for (const value of ['"true"', '"false"', "null", "1", "[]", "{}"])
    assert.throws(() => config(`open_in_new_window: ${value}`), /must be true or false/);
});
