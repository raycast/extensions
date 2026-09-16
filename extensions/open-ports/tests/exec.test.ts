import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CommandError, appleScriptQuote, runCommand, runCommandAsAdmin, shellQuote } from "../src/core/exec";

const CONTROL_CHARACTER = String.fromCharCode(10);
const NUL = String.fromCharCode(0);

describe("shellQuote", () => {
  it("neutralises shell metacharacters", () => {
    assert.equal(shellQuote("simple"), "'simple'");
    assert.equal(shellQuote("a b"), "'a b'");
    assert.equal(shellQuote("; rm -rf /"), "'; rm -rf /'");
    assert.equal(shellQuote("$(whoami)"), "'$(whoami)'");
  });

  it("closes and reopens the quote around an embedded single quote", () => {
    assert.equal(shellQuote("it's"), "'it'\\''s'");
  });

  it("survives a payload designed to break out of single quotes", async () => {
    const payload = "'; touch /tmp/open-ports-pwned; echo '";
    const { stdout } = await runCommand("/bin/sh", ["-c", `printf %s ${shellQuote(payload)}`]);
    assert.equal(stdout, payload);
  });
});

describe("appleScriptQuote", () => {
  it("escapes the two characters an AppleScript literal cares about", () => {
    assert.equal(appleScriptQuote("plain"), '"plain"');
    assert.equal(appleScriptQuote('say "hi"'), '"say \\"hi\\""');
    assert.equal(appleScriptQuote("back\\slash"), '"back\\\\slash"');
  });
});

describe("runCommand", () => {
  it("passes arguments through execve, so no shell can interpret them", async () => {
    const injection = "hello; rm -rf /";
    const { stdout } = await runCommand("/bin/echo", [injection]);
    assert.equal(stdout.trim(), injection);
  });

  it("reports a non-zero exit without output as an empty result", async () => {
    const result = await runCommand("/usr/bin/false", []);
    assert.equal(result.exitCode, 1);
    assert.equal(result.stdout, "");
  });

  it("refuses anything but an absolute path", async () => {
    await assert.rejects(() => runCommand("echo", ["hi"]), CommandError);
    await assert.rejects(() => runCommand("../../bin/echo", ["hi"]), CommandError);
  });

  it("refuses control characters in arguments", async () => {
    await assert.rejects(() => runCommand("/bin/echo", [`a${CONTROL_CHARACTER}b`]), CommandError);
    await assert.rejects(() => runCommand("/bin/echo", [`a${NUL}b`]), CommandError);
  });
});

describe("runCommandAsAdmin", () => {
  // These must fail validation before osascript is spawned, so no dialog is ever shown.
  it("refuses control characters before it can build a root shell command", async () => {
    await assert.rejects(
      () => runCommandAsAdmin("/bin/kill", [`-9${CONTROL_CHARACTER}rm -rf /`], "prompt"),
      CommandError,
    );
    await assert.rejects(() => runCommandAsAdmin("/bin/kill", ["-9"], `prompt${CONTROL_CHARACTER}`), CommandError);
  });

  it("refuses a relative binary", async () => {
    await assert.rejects(() => runCommandAsAdmin("kill", ["-9", "1"], "prompt"), CommandError);
  });
});
