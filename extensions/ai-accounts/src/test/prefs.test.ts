import { test } from "node:test";
import assert from "node:assert/strict";
import { toConfig } from "../lib/prefs";

test("Codex switching defaults to CodexBar unless direct is explicitly selected", () => {
  for (const mode of [undefined, "", "codexbar", "invalid", "DIRECT", " direct "]) {
    assert.equal(toConfig({ codexSwitchMode: mode }).codexSwitchMode, "codexbar");
  }
  assert.equal(toConfig({ codexSwitchMode: "direct" }).codexSwitchMode, "direct");
});

test("after-switch command trims outer whitespace and preserves shell syntax", () => {
  const command = `printf '%s\\n' "$AI_ACCOUNTS_ACCOUNT"
echo "done"`;
  assert.equal(toConfig({ afterSwitchCommand: ` \t${command}\n ` }).afterSwitchCommand, command);
});

test("missing and blank after-switch commands are disabled", () => {
  assert.equal(toConfig({}).afterSwitchCommand, "");
  assert.equal(toConfig({ afterSwitchCommand: "" }).afterSwitchCommand, "");
  assert.equal(toConfig({ afterSwitchCommand: " \n\t " }).afterSwitchCommand, "");
});

test("other preference parsing retains its defaults, bounds, and normalization", () => {
  const defaults = toConfig({});
  assert.equal(defaults.autoAddClaudeLogins, true);
  assert.equal(defaults.menuBarValue, "detailed");
  assert.equal(defaults.percentMode, "remaining");
  assert.equal(defaults.suggestion.threshold, 20);
  const parsed = toConfig({
    cswapPath: " /usr/local/bin/cswap ",
    switchThreshold: "100",
    menuBarValue: "weekly",
    percentMode: "used",
    autoAddClaudeLogins: false,
    includeScopedWindows: true,
    expiringQuotaAdvice: true,
    excludeFromSuggestions: " A@EXAMPLE.COM, Work, , ",
  });
  assert.equal(parsed.cswapPath, "/usr/local/bin/cswap");
  assert.equal(parsed.menuBarValue, "weekly");
  assert.equal(parsed.percentMode, "used");
  assert.equal(parsed.autoAddClaudeLogins, false);
  assert.equal(parsed.suggestion.threshold, 90);
  assert.equal(parsed.suggestion.includeScopedWindows, true);
  assert.equal(parsed.suggestion.expiringQuotaAdvice, true);
  assert.deepEqual(parsed.suggestion.exclude, ["a@example.com", "work"]);
  assert.equal(toConfig({ switchThreshold: "0" }).suggestion.threshold, 1);
  assert.equal(toConfig({ switchThreshold: "invalid" }).suggestion.threshold, 20);
});
