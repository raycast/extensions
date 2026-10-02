import assert from "node:assert/strict";
import test from "node:test";

import { parseCopilotResponse } from "./fetcher.ts";

test("parseCopilotResponse maps premium interactions to AI credit percentage and units", () => {
  const { usage, error } = parseCopilotResponse({
    copilot_plan: "business",
    quota_reset_date: "2026-09-01T00:00:00Z",
    quota_snapshots: {
      premium_interactions: {
        percent_remaining: 8,
        remaining: 24,
        entitlement: 300,
      },
      chat: { percent_remaining: 100 },
    },
  });

  assert.equal(error, null);
  assert.deepEqual(usage, {
    plan: "Business",
    aiCreditsRemainingPercent: 8,
    aiCreditsRemaining: 24,
    aiCreditsEntitlement: 300,
    chatRemaining: 100,
    quotaResetDate: "2026-09-01T00:00:00Z",
  });
});

test("parseCopilotResponse derives AI credit units from legacy quota fields", () => {
  const { usage, error } = parseCopilotResponse({
    monthly_quotas: { completions: "300", chat: 100 },
    limited_user_quotas: { completions: "75", chat: 50 },
  });

  assert.equal(error, null);
  assert.equal(usage?.aiCreditsRemainingPercent, 25);
  assert.equal(usage?.aiCreditsRemaining, 75);
  assert.equal(usage?.aiCreditsEntitlement, 300);
});
