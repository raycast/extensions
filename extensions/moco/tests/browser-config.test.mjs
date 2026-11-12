import assert from "node:assert/strict";
import test from "node:test";
import {
  BROWSERS,
  browserConfigKey,
  chooseBrowser,
  DEFAULT_BROWSER_CONFIG,
  parseBrowserConfig,
} from "../src/utils/browser-config.ts";

test("automatic mode uses the active supported browser, including Safari and Arc", () => {
  for (const browser of BROWSERS)
    assert.equal(chooseBrowser({ ...DEFAULT_BROWSER_CONFIG, autoDetectJira: true }, browser.id)?.id, browser.id);
});

test("automatic mode never falls back to a background Safari window", () => {
  for (const app of [undefined, "com.microsoft.VSCode", "com.raycast.macos", "org.mozilla.firefox"])
    assert.equal(chooseBrowser({ ...DEFAULT_BROWSER_CONFIG, autoDetectJira: true }, app), undefined);
});

test("a selected fixed browser can be used while another app is active", () => {
  assert.equal(
    chooseBrowser(
      { ...DEFAULT_BROWSER_CONFIG, autoDetectJira: true, browser: "com.apple.Safari" },
      "com.microsoft.VSCode",
    )?.name,
    "Safari",
  );
});

test("turning off Jira detection disables every browser selection", () => {
  for (const browser of ["frontmost", "com.apple.Safari"])
    assert.equal(
      chooseBrowser({ ...DEFAULT_BROWSER_CONFIG, autoDetectJira: false, browser }, "com.apple.Safari"),
      undefined,
    );
});

test("browser settings preserve the domain restriction and detection choice", () => {
  const config = {
    version: 1,
    browser: "company.thebrowser.Browser",
    autoDetectJira: false,
    jiraDomains: "your-team.atlassian.net",
  };
  assert.deepEqual(parseBrowserConfig(JSON.stringify(config)), config);
});

test("missing or corrupt configuration has known defaults", () => {
  for (const value of [
    undefined,
    "broken",
    "null",
    "{}",
    JSON.stringify({ ...DEFAULT_BROWSER_CONFIG, browser: "untrusted.app" }),
    JSON.stringify({ ...DEFAULT_BROWSER_CONFIG, version: 2 }),
  ])
    assert.deepEqual(parseBrowserConfig(value), DEFAULT_BROWSER_CONFIG);
  assert.equal(chooseBrowser(parseBrowserConfig(undefined), "com.apple.Safari"), undefined);
});

test("browser settings are isolated by MOCO tenant", () => {
  assert.notEqual(browserConfigKey("example-company"), browserConfigKey("other"));
  assert.equal(browserConfigKey(" EXAMPLE-COMPANY "), browserConfigKey("example-company"));
});
