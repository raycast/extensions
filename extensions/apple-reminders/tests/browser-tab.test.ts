import assert from "node:assert";
import { describe, it } from "node:test";

import {
  ALL_SUPPORTED_BROWSERS,
  CHROMIUM_BROWSERS,
  getTabAppleScript,
  parseTabResult,
  TAB_DELIMITER,
  WEBKIT_BROWSERS,
} from "../src/helpers/browser";

describe("Browser Tab Extraction Helpers", () => {
  it("generates correct AppleScript for WebKit browsers", () => {
    for (const browser of WEBKIT_BROWSERS) {
      const script = getTabAppleScript(browser);
      assert.ok(script.includes(`tell application "${browser}"`));
      assert.ok(script.includes("tell front window"));
      assert.ok(script.includes("get name of current tab"));
      assert.ok(script.includes("get URL of current tab"));
    }
  });

  it("generates correct AppleScript for Chromium browsers", () => {
    for (const browser of CHROMIUM_BROWSERS) {
      const script = getTabAppleScript(browser);
      assert.ok(script.includes(`tell application "${browser}"`));
      assert.ok(script.includes("tell front window"));
      assert.ok(script.includes("get title of active tab"));
      assert.ok(script.includes("get URL of active tab"));
    }
  });

  it("parses valid raw result with title and URL", () => {
    const raw = `GitHub - Raycast Extensions${TAB_DELIMITER}https://github.com/raycast/extensions`;
    const parsed = parseTabResult(raw, "Safari");

    assert.deepStrictEqual(parsed, {
      title: "GitHub - Raycast Extensions",
      url: "https://github.com/raycast/extensions",
      browser: "Safari",
    });
  });

  it("handles titles containing pipes and special characters without corrupting URL", () => {
    const raw = `Project A ||| Project B (v2.0)${TAB_DELIMITER}https://github.com/raycast/extensions/pull/123`;
    const parsed = parseTabResult(raw, "Arc");

    assert.deepStrictEqual(parsed, {
      title: "Project A ||| Project B (v2.0)",
      url: "https://github.com/raycast/extensions/pull/123",
      browser: "Arc",
    });
  });

  it("falls back to URL as title when title is empty", () => {
    const raw = `${TAB_DELIMITER}https://raycast.com`;
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
    assert.strictEqual(parseTabResult(`   ${TAB_DELIMITER}   `, "Brave Browser"), undefined);
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

describe("Current Tab Reminder Payload & Default Due Date", () => {
  it("formats default due date using natural language parse", async () => {
    const { parseDueDate } = await import("../src/parse-due-date");
    const parsed = parseDueDate("today 6pm");
    assert.ok(parsed);
    assert.strictEqual(parsed.isDateTime, true);
    assert.strictEqual(parsed.date.getHours(), 18);
  });

  it("sets native url property when creating reminder from tab", async () => {
    const { createReminder } = await import("swift:../swift/AppleReminders");
    const reminder = await createReminder({
      title: "GitHub Pull Request",
      notes: "https://github.com/raycast/extensions/pull/31436",
      url: "https://github.com/raycast/extensions/pull/31436",
    });

    assert.strictEqual(reminder.title, "GitHub Pull Request");
    assert.deepStrictEqual(reminder.attachedUrls, ["https://github.com/raycast/extensions/pull/31436"]);
    assert.strictEqual(reminder.url, "https://github.com/raycast/extensions/pull/31436");
  });
});

