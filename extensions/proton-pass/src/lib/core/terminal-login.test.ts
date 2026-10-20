import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { escapeAppleScriptString, shellQuote, terminalLoginScript } from "./terminal-login";

// The path pass-cli is installed at by the extension contains spaces ("Application Support").
const INSTALLED_CLI =
  "/Users/example/Library/Application Support/com.raycast.macos/extensions/proton-pass/cli/pass-cli";

test("quotes paths for the shell, spaces and quotes included", () => {
  for (const path of [INSTALLED_CLI, "/opt/it's here/pass-cli", '/tmp/a "b"/pass-cli']) {
    const words = execFileSync("/bin/sh", ["-c", `printf '%s|' ${shellQuote(path)} login`], { encoding: "utf8" });
    assert.equal(words, `${path}|login|`);
  }
});

test("runs login with the given pass-cli in Terminal", () => {
  assert.equal(
    terminalLoginScript(INSTALLED_CLI),
    ['tell application "Terminal"', "  activate", `  do script "'${INSTALLED_CLI}' login"`, "end tell"].join("\n"),
  );
  assert.equal(escapeAppleScriptString('say "hi" \\ bye'), 'say \\"hi\\" \\\\ bye');
});

test("AppleScript compiles the Terminal login script", { skip: process.platform !== "darwin" }, () => {
  execFileSync("osacompile", ["-o", "/dev/null", "-e", terminalLoginScript('/tmp/a "b"/it\'s/pass-cli')]);
});
