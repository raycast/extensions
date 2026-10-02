const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { api, reset } = require("./harness.cjs");
const { startMenuBarOnce } = require("../src/attention/lib/menu-onboarding.ts");
beforeEach(() => { reset(); api.Toast = { Style: { Failure: "failure" } }; });
test("starts the menu once and respects later user choices", async () => {
  const launches = [];
  api.launchCommand = async options => launches.push(options);
  await startMenuBarOnce();
  await startMenuBarOnce();
  assert.deepEqual(launches, [{ name: "actionablePullRequests", type: "user" }]);
});
test("disabled command provides settings guidance without repeated launch attempts", async () => {
  let attempts = 0;
  const toasts = [];
  api.openExtensionPreferences = async () => {};
  api.launchCommand = async () => { attempts++; throw new Error("disabled"); };
  api.showToast = async toast => toasts.push(toast);
  await startMenuBarOnce();
  await startMenuBarOnce();
  assert.equal(attempts, 1);
  assert.equal(toasts.length, 1);
  assert.equal(toasts[0].primaryAction.onAction, api.openExtensionPreferences);
});
