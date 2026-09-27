// ─────────────────────────────────────────────────────────────────────
// service.test.mjs — pure unit tests for Switcheroo service helpers.
// Uses node:test (built-in, zero dependencies).
// Run: node --test src/lib/service.test.mjs
// ─────────────────────────────────────────────────────────────────────
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  parseLaunchctlProgram,
  isValidHomebrewExec,
  HOMEBREW_EXACT_EXECS,
} from "./service-pure.mjs";

describe("parseLaunchctlProgram", () => {
  test("extracts program path from standard output", () => {
    const output = `
{
    program = /Users/test/.local/bin/Switcheroo.app/Contents/MacOS/switcheroo
}`;
    assert.equal(
      parseLaunchctlProgram(output),
      "/Users/test/.local/bin/Switcheroo.app/Contents/MacOS/switcheroo",
    );
  });

  test("handles leading whitespace", () => {
    assert.equal(
      parseLaunchctlProgram(
        "    program = /opt/homebrew/opt/switcheroo/Switcheroo.app/Contents/MacOS/switcheroo",
      ),
      "/opt/homebrew/opt/switcheroo/Switcheroo.app/Contents/MacOS/switcheroo",
    );
  });

  test("returns empty string when no program line", () => {
    assert.equal(parseLaunchctlProgram("state = running"), "");
  });

  test("returns empty string for empty input", () => {
    assert.equal(parseLaunchctlProgram(""), "");
  });

  test("handles tab indentation", () => {
    assert.equal(
      parseLaunchctlProgram("\t\tprogram = /usr/local/bin/test"),
      "/usr/local/bin/test",
    );
  });

  test("returns first match for multiple lines", () => {
    assert.equal(
      parseLaunchctlProgram("program = /first\nprogram = /second"),
      "/first",
    );
  });

  test("handles paths with spaces", () => {
    assert.equal(
      parseLaunchctlProgram(
        "program = /Users/My User/Switcheroo.app/Contents/MacOS/switcheroo",
      ),
      "/Users/My User/Switcheroo.app/Contents/MacOS/switcheroo",
    );
  });

  test("does not match without = sign", () => {
    assert.equal(
      parseLaunchctlProgram("program /usr/bin/foo\nprogram = /usr/bin/bar"),
      "/usr/bin/bar",
    );
  });
});

describe("isValidHomebrewExec — exact path matching", () => {
  test("accepts /opt/homebrew exact path", () => {
    assert.equal(isValidHomebrewExec(HOMEBREW_EXACT_EXECS[0]), true);
  });

  test("accepts /usr/local exact path", () => {
    assert.equal(isValidHomebrewExec(HOMEBREW_EXACT_EXECS[1]), true);
  });

  // Adversarial tests
  test("rejects path traversal via ..", () => {
    assert.equal(
      isValidHomebrewExec(
        "/opt/homebrew/anything/../foreign/Switcheroo.app/Contents/MacOS/switcheroo",
      ),
      false,
    );
  });

  test("rejects Cellar path (not opt/)", () => {
    assert.equal(
      isValidHomebrewExec(
        "/opt/homebrew/Cellar/switcheroo/0.1.0/Switcheroo.app/Contents/MacOS/switcheroo",
      ),
      false,
    );
  });

  test("rejects /opt/homebrewfoo (prefix without separator)", () => {
    assert.equal(
      isValidHomebrewExec(
        "/opt/homebrewfoo/opt/switcheroo/Switcheroo.app/Contents/MacOS/switcheroo",
      ),
      false,
    );
  });

  test("rejects standalone ~/.local/bin path", () => {
    assert.equal(
      isValidHomebrewExec(
        "/Users/test/.local/bin/Switcheroo.app/Contents/MacOS/switcheroo",
      ),
      false,
    );
  });

  test("rejects empty/null/undefined", () => {
    assert.equal(isValidHomebrewExec(""), false);
    assert.equal(isValidHomebrewExec(null), false);
    assert.equal(isValidHomebrewExec(undefined), false);
  });

  test("rejects wrong app name", () => {
    assert.equal(
      isValidHomebrewExec(
        "/opt/homebrew/opt/otherapp/OtherApp.app/Contents/MacOS/otherapp",
      ),
      false,
    );
  });

  test("rejects trailing slash", () => {
    assert.equal(
      isValidHomebrewExec(
        "/opt/homebrew/opt/switcheroo/Switcheroo.app/Contents/MacOS/switcheroo/",
      ),
      false,
    );
  });

  test("rejects extra components after switcheroo", () => {
    assert.equal(
      isValidHomebrewExec(
        "/opt/homebrew/opt/switcheroo/Switcheroo.app/Contents/MacOS/switcheroo/extra",
      ),
      false,
    );
  });

  test("rejects encoded characters", () => {
    assert.equal(
      isValidHomebrewExec(
        "/opt/homebrew/opt/switcheroo/Switcheroo.app/Contents/MacOS/switcheroo%00",
      ),
      false,
    );
  });

  test("rejects newlines (injection)", () => {
    assert.equal(
      isValidHomebrewExec(
        "/opt/homebrew/opt/switcheroo/Switcheroo.app/Contents/MacOS/switcheroo\nevil",
      ),
      false,
    );
  });

  test("rejects case-variant", () => {
    assert.equal(
      isValidHomebrewExec(
        "/opt/Homebrew/opt/switcheroo/Switcheroo.app/Contents/MacOS/switcheroo",
      ),
      false,
    );
  });

  test("rejects arbitrary paths", () => {
    assert.equal(isValidHomebrewExec("/tmp/foo"), false);
    assert.equal(isValidHomebrewExec("/etc/passwd"), false);
    assert.equal(isValidHomebrewExec("relative/path"), false);
  });
});
