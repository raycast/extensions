import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  FRONTMOST_APP_SCRIPT,
  frontmostNameFromError,
  isBundleId,
  KeyCode,
  keyPressScript,
  missingPermission,
  NOT_FRONTMOST_ERROR,
  parseFrontmostApp,
} from "./key-press";

test("presses keys only while the expected app is in front", () => {
  const guard = [
    "  set frontmostApp to first application process whose frontmost is true",
    `  if bundle identifier of frontmostApp is not "com.example.app" then error "${NOT_FRONTMOST_ERROR} [" & displayed name of frontmostApp & "]"`,
  ];

  assert.equal(
    keyPressScript(KeyCode.Tab, [], "com.example.app"),
    ['tell application "System Events"', ...guard, "  key code 48", "end tell"].join("\n"),
  );
  assert.equal(
    keyPressScript(KeyCode.V, ["command"], "com.example.app"),
    ['tell application "System Events"', ...guard, "  key code 9 using {command down}", "end tell"].join("\n"),
  );
  assert.match(
    keyPressScript(KeyCode.Return, ["command", "shift"], "com.example.app"),
    /key code 36 using \{command down, shift down\}/,
  );
});

test("only accepts bundle identifiers that can't break out of the script", () => {
  assert.equal(isBundleId("com.example.my-app2"), true);
  assert.equal(isBundleId(undefined), false);
  assert.equal(isBundleId(""), false);
  assert.equal(isBundleId('com.example" then beep'), false);
  assert.throws(() => keyPressScript(KeyCode.V, ["command"], 'x" & "y'), /Invalid bundle identifier/);
});

test("tells which permission is missing, Accessibility or Automation", () => {
  assert.equal(
    missingPermission("System Events got an error: osascript is not allowed to send keystrokes. (1002)"),
    "accessibility",
  );
  assert.equal(
    missingPermission("System Events got an error: Access for assistive devices is disabled. (-25211)"),
    "accessibility",
  );
  assert.equal(missingPermission("Not authorized to send Apple events to System Events. (-1743)"), "automation");
  assert.equal(missingPermission("System Events got an error: Can’t get process 1. (-1728)"), undefined);
  assert.equal(missingPermission(`execution error: ${NOT_FRONTMOST_ERROR} (-2700)`), undefined);
});

test("reads which app is in front, with its name", () => {
  assert.deepEqual(parseFrontmostApp("com.example.helper\nExample Helper"), {
    bundleId: "com.example.helper",
    name: "Example Helper",
  });
  // A process without a bundle, such as a command-line tool.
  assert.deepEqual(parseFrontmostApp("missing value\nexample-tool"), { bundleId: "", name: "example-tool" });
  assert.deepEqual(parseFrontmostApp("com.example.app\n"), { bundleId: "com.example.app", name: undefined });

  const failure = (name: string) =>
    `Command failed with exit code 1: osascript\n6:180: execution error: ${NOT_FRONTMOST_ERROR} [${name}] (-2700)`;
  assert.equal(frontmostNameFromError(failure("Example Helper")), "Example Helper");
  assert.equal(frontmostNameFromError(failure("Example [Beta]")), "Example [Beta]");
  assert.equal(frontmostNameFromError(failure("")), undefined);
  assert.equal(frontmostNameFromError(failure("missing value")), undefined);
  assert.equal(frontmostNameFromError(`execution error: ${NOT_FRONTMOST_ERROR} (-2700)`), undefined);
});

test("AppleScript reads the scripts as written", { skip: process.platform !== "darwin" }, () => {
  const dir = mkdtempSync(join(tmpdir(), "key-press-"));
  const lines = (text: string) =>
    text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  for (const script of [keyPressScript(KeyCode.V, ["command"], "com.example.app"), FRONTMOST_APP_SCRIPT]) {
    writeFileSync(join(dir, "script.applescript"), script);
    execFileSync("osacompile", ["-o", join(dir, "script.scpt"), join(dir, "script.applescript")]);
    // Decompiling shows how AppleScript grouped each expression, e.g. a comparison taken into a `whose` filter.
    const decompiled = execFileSync("osadecompile", [join(dir, "script.scpt")], { encoding: "utf8" });
    assert.deepEqual(lines(decompiled), lines(script));
  }
});

test("finds the app name in the error AppleScript really prints", { skip: process.platform !== "darwin" }, () => {
  // The same error as keyPressScript(), without System Events.
  const script = `error "${NOT_FRONTMOST_ERROR} [" & "Exemple [Bêta]" & "]"`;
  const result = spawnSync("osascript", ["-e", script], { encoding: "utf8" });
  assert.notEqual(result.status, 0);
  assert.equal(frontmostNameFromError(result.stderr), "Exemple [Bêta]");
});
