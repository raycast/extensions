import assert from "node:assert/strict";
import test from "node:test";
import { getBlockMenuPolicy } from "../src/lib/block-menu";

test("uses one primary action and only state-specific secondary actions", () => {
  assert.deepEqual(getBlockMenuPolicy({ state: "disabled", kind: "website-app" }), {
    primaryAction: "start",
    secondaryAction: "start-options",
    showWebsiteEditing: true,
    showBreakControls: false,
  });

  assert.deepEqual(getBlockMenuPolicy({ state: "enabled", kind: "website-app" }), {
    primaryAction: "stop",
    showWebsiteEditing: true,
    showBreakControls: true,
  });

  assert.deepEqual(getBlockMenuPolicy({ state: "enabled", kind: "device" }), {
    primaryAction: "stop",
    showWebsiteEditing: false,
    showBreakControls: false,
  });
});

test("treats an unknown state as diagnostic instead of guessing a mutation", () => {
  assert.deepEqual(getBlockMenuPolicy({ state: "unknown", kind: "website-app" }), {
    primaryAction: "refresh",
    secondaryAction: "diagnostics",
    showWebsiteEditing: false,
    showBreakControls: false,
  });
});
