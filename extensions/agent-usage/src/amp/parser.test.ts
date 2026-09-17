import assert from "node:assert/strict";
import test from "node:test";

import { parseAmpUsage } from "./parser.ts";

const SAMPLE_OUTPUT = `Signed in as zvq@live.com (spikezhang)
Amp Free: 100% remaining today (resets daily) - https://ampcode.com/settings#amp-free
Individual credits: $10 remaining (set up automatic top-up to avoid running out) - https://ampcode.com/settings
`;

const MARKDOWN_SUBSCRIPTION_OUTPUT = `Signed in as zvq@live.com (spikezhang)
**Amp Free:** 98% remaining today (resets daily) - https://ampcode.com/settings#amp-free
**Amp Megawatt Subscription:** 0% other usage and 99% orb usage remaining - resets upon renewal in 24 days
**Individual credits:** $16.75 remaining (set up auto-reload to avoid running out) - https://ampcode.com/settings
`;

test("parseAmpUsage parses percent-based Amp Free and individual credits", () => {
  const { usage, error } = parseAmpUsage(SAMPLE_OUTPUT);

  assert.equal(error, null);
  assert.ok(usage);
  assert.equal(usage.email, "zvq@live.com");
  assert.equal(usage.nickname, "spikezhang");
  assert.equal(usage.ampFree?.percentRemaining, 100);
  assert.equal(usage.ampFree?.resetNote, "resets daily");
  assert.equal(usage.individualCredits.remaining, 10);
  assert.equal(usage.individualCredits.unit, "$");
  assert.equal(usage.subscription, undefined);
});

test("parseAmpUsage parses fractional percent remaining", () => {
  const output = `Signed in as user@example.com (nick)
Amp Free: 37.5% remaining today (resets daily)
Individual credits: $0 remaining
`;
  const { usage, error } = parseAmpUsage(output);

  assert.equal(error, null);
  assert.ok(usage);
  assert.equal(usage.ampFree?.percentRemaining, 37.5);
  assert.equal(usage.individualCredits.remaining, 0);
});

test("parseAmpUsage parses markdown-bold labels and Megawatt subscription remaining", () => {
  const { usage, error } = parseAmpUsage(MARKDOWN_SUBSCRIPTION_OUTPUT);

  assert.equal(error, null);
  assert.ok(usage);
  assert.equal(usage.email, "zvq@live.com");
  assert.equal(usage.nickname, "spikezhang");
  assert.equal(usage.ampFree?.percentRemaining, 98);
  assert.equal(usage.ampFree?.resetNote, "resets daily");
  assert.equal(usage.subscription?.plan, "Megawatt");
  assert.equal(usage.subscription?.otherPercentRemaining, 0);
  assert.equal(usage.subscription?.orbPercentRemaining, 99);
  assert.equal(usage.subscription?.resetNote, "resets upon renewal in 24 days");
  assert.equal(usage.individualCredits.remaining, 16.75);
});

test("parseAmpUsage parses TTY Amp Megawatt output without markdown", () => {
  const output = `Signed in as zvq@live.com (spikezhang)
Amp Free: 98% remaining today (resets daily) - https://ampcode.com/settings#amp-free
Amp Megawatt Subscription: 0% other usage and 99% orb usage remaining - resets upon renewal in 24 days
Individual credits: $16.75 remaining (set up auto-reload to avoid running out) - https://ampcode.com/settings
`;
  const { usage, error } = parseAmpUsage(output);

  assert.equal(error, null);
  assert.ok(usage);
  assert.equal(usage.ampFree?.percentRemaining, 98);
  assert.equal(usage.subscription?.plan, "Megawatt");
  assert.equal(usage.subscription?.otherPercentRemaining, 0);
  assert.equal(usage.subscription?.orbPercentRemaining, 99);
  assert.equal(usage.individualCredits.remaining, 16.75);
});

test("parseAmpUsage parses subscription-only Amp CLI output", () => {
  const output = `Signed in as fixture@example.test (example)
Subscription Gigawatt: 73% other usage and 91% orb usage remaining - resets upon renewal in 1 month - https://ampcode.com/settings
`;
  const { usage, error } = parseAmpUsage(output);

  assert.equal(error, null);
  assert.ok(usage);
  assert.equal(usage.ampFree, undefined);
  assert.equal(usage.subscription?.plan, "Gigawatt");
  assert.equal(usage.subscription?.otherPercentRemaining, 73);
  assert.equal(usage.subscription?.orbPercentRemaining, 91);
  assert.equal(usage.subscription?.resetNote, "resets upon renewal in 1 month");
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
