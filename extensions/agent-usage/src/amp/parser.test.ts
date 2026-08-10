import test from "node:test";
import assert from "node:assert/strict";
import { parseAmpUsage } from "./parser";

const SAMPLE_OUTPUT = `Signed in as zvq@live.com (spikezhang)
Amp Free: 100% remaining today (resets daily) - https://ampcode.com/settings#amp-free
Individual credits: $10 remaining (set up automatic top-up to avoid running out) - https://ampcode.com/settings
`;

test("parseAmpUsage parses percent-based Amp Free and individual credits", () => {
  const { usage, error } = parseAmpUsage(SAMPLE_OUTPUT);

  assert.equal(error, null);
  assert.ok(usage);
  assert.equal(usage.email, "zvq@live.com");
  assert.equal(usage.nickname, "spikezhang");
  assert.equal(usage.ampFree.percentRemaining, 100);
  assert.equal(usage.ampFree.resetNote, "resets daily");
  assert.equal(usage.individualCredits.remaining, 10);
  assert.equal(usage.individualCredits.unit, "$");
});

test("parseAmpUsage parses fractional percent remaining", () => {
  const output = `Signed in as user@example.com (nick)
Amp Free: 37.5% remaining today (resets daily)
Individual credits: $0 remaining
`;
  const { usage, error } = parseAmpUsage(output);

  assert.equal(error, null);
  assert.ok(usage);
  assert.equal(usage.ampFree.percentRemaining, 37.5);
  assert.equal(usage.individualCredits.remaining, 0);
});

test("parseAmpUsage returns an error when Amp Free uses the old dollar format", () => {
  const output = `Signed in as user@example.com (nick)
Amp Free: $15/$15 remaining
Individual credits: $10 remaining
`;
  const { usage, error } = parseAmpUsage(output);

  assert.equal(usage, null);
  assert.equal(error?.type, "unknown");
});

test("parseAmpUsage detects not logged in", () => {
  const { usage, error } = parseAmpUsage("Not logged in. Please run amp login first.");

  assert.equal(usage, null);
  assert.equal(error?.type, "not_logged_in");
});
