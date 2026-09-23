import assert from "node:assert";
import { describe, it } from "node:test";

import {
  ALL_SUPPORTED_BROWSERS,
  CHROMIUM_BROWSERS,
  getTabAppleScript,
  parseTabResult,
  WEBKIT_BROWSERS,
} from "../src/helpers/browser";

describe("Browser Tab Extraction Helpers", () => {
  it("generates correct AppleScript for WebKit browsers", () => {
    for (const browser of WEBKIT_BROWSERS) {
      const script = getTabAppleScript(browser);
      assert.ok(script.includes(`tell application "${browser}"`));
      assert.ok(script.includes("current tab of front window"));
      assert.ok(script.includes("name of currentTab"));
      assert.ok(script.includes("URL of currentTab"));
    }
  });

  it("generates correct AppleScript for Chromium browsers", () => {
    for (const browser of CHROMIUM_BROWSERS) {
      const script = getTabAppleScript(browser);
      assert.ok(script.includes(`tell application "${browser}"`));
      assert.ok(script.includes("active tab of front window"));
      assert.ok(script.includes("title of currentTab"));
      assert.ok(script.includes("URL of currentTab"));
    }
  });

  it("parses valid raw result with title and URL", () => {
    const raw = "GitHub - Raycast Extensions|||https://github.com/raycast/extensions";
    const parsed = parseTabResult(raw, "Safari");

    assert.deepStrictEqual(parsed, {
      title: "GitHub - Raycast Extensions",
      url: "https://github.com/raycast/extensions",
      browser: "Safari",
    });
  });

  it("falls back to URL as title when title is empty", () => {
    const raw = "|||https://raycast.com";
    const parsed = parseTabResult(raw, "Google Chrome");

    assert.deepStrictEqual(parsed, {
      title: "https://raycast.com",
      url: "https://raycast.com",
      browser: "Google Chrome",
    });
  });

  it("returns undefined when result has no delimiter or is empty", () => {
    assert.strictEqual(parseTabResult("", "Safari"), undefined);
    assert.strictEqual(parseTabResult(undefined, "Safari"), undefined);
    assert.strictEqual(parseTabResult("No delimiter here", "Arc"), undefined);
    assert.strictEqual(parseTabResult("   |||   ", "Brave Browser"), undefined);
  });

  it("includes major macOS browsers in ALL_SUPPORTED_BROWSERS", () => {
    const expected = ["Safari", "Google Chrome", "Arc", "Brave Browser", "Microsoft Edge", "Orion", "Vivaldi", "Opera"];
    for (const name of expected) {
      assert.ok(
        (ALL_SUPPORTED_BROWSERS as readonly string[]).includes(name),
        `Expected ${name} to be in ALL_SUPPORTED_BROWSERS`
      );
    }
  });
});
