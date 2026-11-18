import assert from "node:assert/strict";
import test from "node:test";

import {
  getChromiumCurrentTabAppleScript,
  getChromiumNewTabAppleScript,
  getChromiumNewWindowAppleScript,
  getSafariCurrentTabAppleScript,
  getSafariNewTabAppleScript,
  getSafariNewWindowAppleScript,
  runBrowserAutomation,
} from "../src/utils/browserOpening.ts";

test("generates current-tab, new-tab, and new-window scripts for the selected Chromium browser", () => {
  const currentTabScript = getChromiumCurrentTabAppleScript("com.brave.browser");
  const newTabScript = getChromiumNewTabAppleScript("com.brave.browser");
  const newWindowScript = getChromiumNewWindowAppleScript("com.brave.browser");

  for (const script of [currentTabScript, newTabScript, newWindowScript]) {
    assert.match(script, /using terms from application id "com\.brave\.browser"/);
    assert.match(script, /tell application id "com\.brave\.browser"/);
    assert.doesNotMatch(script, /Google Chrome/);
  }

  assert.match(currentTabScript, /set targetWindow to front window/);
  assert.match(currentTabScript, /set URL of active tab of targetWindow to targetURL/);
  assert.doesNotMatch(currentTabScript, /tell front window to make new tab/);
  assert.match(newTabScript, /make new tab with properties \{URL:targetURL\}/);
  assert.match(newWindowScript, /set newWindow to make new window/);

  assert.throws(() => getChromiumNewWindowAppleScript('com.example.browser"\nactivate'));
});

test("generates Safari scripts that reuse or create a tab as requested", () => {
  const currentTabScript = getSafariCurrentTabAppleScript();
  const newTabScript = getSafariNewTabAppleScript();
  const newWindowScript = getSafariNewWindowAppleScript();

  assert.match(currentTabScript, /set URL of current tab of front window to targetURL/);
  assert.doesNotMatch(currentTabScript, /set current tab to make new tab/);
  assert.match(newTabScript, /set current tab to make new tab with properties \{URL:targetURL\}/);
  assert.match(newWindowScript, /make new document with properties \{URL:targetURL\}/);
});

test("falls back to standard opening when browser automation fails", async () => {
  const calls: string[] = [];

  await runBrowserAutomation("script", "https://example.com", {
    closeWindow: async () => {
      calls.push("close");
    },
    runScript: async () => {
      calls.push("script");
      throw new Error("Automation denied");
    },
    openFallback: async () => {
      calls.push("fallback");
    },
  });

  assert.deepEqual(calls, ["close", "script", "fallback"]);
});

test("does not use the fallback when browser automation succeeds", async () => {
  const calls: string[] = [];

  await runBrowserAutomation("script", "https://example.com", {
    closeWindow: async () => {
      calls.push("close");
    },
    runScript: async () => {
      calls.push("script");
    },
    openFallback: async () => {
      calls.push("fallback");
    },
  });

  assert.deepEqual(calls, ["close", "script"]);
});
