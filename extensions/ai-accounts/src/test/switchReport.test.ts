import assert from "node:assert/strict";
import { test } from "node:test";
import { SwitchRequest } from "../lib/model";
import { switchReport, UNKNOWN_HUD } from "../lib/switchReport";

const REQ: SwitchRequest = {
  requestId: "r-1",
  provider: "codex",
  targetKey: "codex:carol@example.com|",
  expectedEmail: "carol@example.com",
  targetLabel: "carol",
  via: "menubar",
};

const UNKNOWN_MESSAGE =
  "Codex switch to carol could not be verified: Codex's auth.json is unreadable, and CodexBar's saved copy of " +
  "alice@example.com is intact. Nothing was rolled back; check CodexBar's System Account menu before switching again.";

test("finding 26: an unknown outcome's HUD and toast carry the sanitized message", () => {
  const report = switchReport(REQ, { state: "unknown", message: `${UNKNOWN_MESSAGE}\u0007` });
  assert.ok(report.hud.startsWith("Switch outcome unknown: Codex switch to carol could not be verified"));
  assert.ok(report.hud.length <= 200);
  assert.ok(!report.hud.includes("\u0007"), "control characters are stripped");
  // The toast keeps the whole message, including the recovery step the HUD may cut.
  assert.equal(report.message, UNKNOWN_MESSAGE);
  assert.equal(report.title, "Switch outcome unknown");
  assert.equal(report.failure, true);
  assert.equal(switchReport(REQ, { state: "unknown", message: "" }).hud, UNKNOWN_HUD);
});

test("finding 4/15: a warning leads the HUD and is shown once in the toast", () => {
  const warning =
    "CodexBar's saved copy of alice@example.com changed after it was saved; check CodexBar's System Account menu before switching back.";
  const withWarning = switchReport(REQ, {
    state: "unknown",
    message: `Codex switch to carol could not be verified: Codex's auth.json holds carol as expected, and ${warning}`,
    warning,
  });
  assert.equal(withWarning.hud, `Switch outcome unknown. ${warning}`);
  assert.equal(withWarning.message.split(warning).length - 1, 1, "not repeated when the message already has it");
  // A warning on an otherwise good outcome is still surfaced, as a failure-styled report.
  const good = switchReport(REQ, { state: "succeeded", message: "Codex → carol.", warning });
  assert.equal(good.hud, `Switch finished. ${warning}`);
  assert.equal(good.message, `Codex → carol. ${warning}`);
  assert.equal(good.failure, true);
});

test("other states keep their texts", () => {
  assert.equal(switchReport(REQ, { state: "succeeded", message: "" }).hud, "Switched to carol");
  assert.equal(switchReport(REQ, { state: "noop", message: "" }).hud, "carol is already active");
  const handoff = switchReport(REQ, { state: "handoff", message: "Pick carol in CodexBar → Codex → System Account." });
  assert.equal(handoff.hud, "Pick carol in CodexBar → Codex → System Account.");
  assert.equal(handoff.title, "Continue in CodexBar");
  assert.equal(handoff.failure, false);
  const failed = switchReport(REQ, { state: "failed", message: "nope" });
  assert.equal(failed.hud, "Switch failed: nope");
  assert.equal(failed.failure, true);
  assert.equal(switchReport(REQ, { state: "failed", message: "" }).hud, "Switch failed");
});
