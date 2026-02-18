import assert from "node:assert/strict";
import test from "node:test";
import { buildTimerFinishedNotificationPlan } from "./timer-notification-policy.ts";

test("completion plan always includes HUD as primary signal and keeps visual fallbacks", () => {
  const userInitiatedPlan = buildTimerFinishedNotificationPlan({ isUserInitiatedLaunch: true });
  const backgroundPlan = buildTimerFinishedNotificationPlan({ isUserInitiatedLaunch: false });

  assert.deepEqual(userInitiatedPlan.channels, ["hud", "system-notification", "toast"]);
  assert.deepEqual(backgroundPlan.channels, ["hud", "system-notification", "toast"]);
});
