import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ACCESSIBILITY_REQUIRED,
  NOTHING_TO_COPY,
  formatSize,
  isAccessibilityError,
  isSlot,
  normalizeCaptureSource,
  previewTitle,
  resolveCapture,
  slotKey,
  slotMarkdown,
  suggestedPasteHotkey,
  suggestedSaveHotkey,
} from "../src/slots.ts";

describe("slots", () => {
  it("recognizes slots 1 through 9", () => {
    for (let slot = 1; slot <= 9; slot += 1) {
      assert.equal(isSlot(slot), true);
      if (isSlot(slot)) {
        assert.equal(slotKey(slot), `clipboard-slot-${slot}`);
      }
    }
    assert.equal(isSlot(0), false);
    assert.equal(isSlot(10), false);
  });

  it("suggests a save and paste shortcut for each slot", () => {
    assert.equal(suggestedSaveHotkey(1), "⌘⌥1");
    assert.equal(suggestedPasteHotkey(1), "⌘⇧1");
    assert.equal(suggestedSaveHotkey(9), "⌘⌥9");
    assert.equal(suggestedPasteHotkey(9), "⌘⇧9");
  });
});

describe("resolveCapture", () => {
  it("prefers the current selection", () => {
    const result = resolveCapture({
      setting: "selection-then-clipboard",
      selection: { ok: true, text: "from the app" },
      clipboardText: "from the clipboard",
    });
    assert.deepEqual(result, { ok: true, text: "from the app", source: "selection" });
  });

  it("falls back to the clipboard when nothing is selected", () => {
    const result = resolveCapture({
      setting: "selection-then-clipboard",
      selection: { ok: false, permissionDenied: false },
      clipboardText: "already copied",
    });
    assert.deepEqual(result, { ok: true, text: "already copied", source: "clipboard" });
  });

  it("does not fall back when accessibility access is missing", () => {
    const result = resolveCapture({
      setting: "selection-then-clipboard",
      selection: { ok: false, permissionDenied: true },
      clipboardText: "already copied",
    });
    assert.deepEqual(result, { ok: false, message: ACCESSIBILITY_REQUIRED });
  });

  it("ignores the clipboard in selection-only mode", () => {
    const result = resolveCapture({
      setting: "selection",
      selection: { ok: false, permissionDenied: false },
      clipboardText: "already copied",
    });
    assert.deepEqual(result, { ok: false, message: NOTHING_TO_COPY });
  });

  it("ignores the selection in clipboard-only mode", () => {
    const result = resolveCapture({
      setting: "clipboard",
      selection: { ok: true, text: "highlighted" },
      clipboardText: "copied",
    });
    assert.deepEqual(result, { ok: true, text: "copied", source: "clipboard" });
  });

  it("reports an empty clipboard", () => {
    const result = resolveCapture({
      setting: "clipboard",
      selection: { ok: false, permissionDenied: false },
      clipboardText: "",
    });
    assert.deepEqual(result, { ok: false, message: NOTHING_TO_COPY });
  });

  it("keeps whitespace that was explicitly selected", () => {
    const result = resolveCapture({
      setting: "selection-then-clipboard",
      selection: { ok: true, text: "  " },
      clipboardText: "other",
    });
    assert.deepEqual(result, { ok: true, text: "  ", source: "selection" });
  });
});

describe("display helpers", () => {
  it("normalizes an unknown capture setting", () => {
    assert.equal(normalizeCaptureSource(undefined), "selection-then-clipboard");
    assert.equal(normalizeCaptureSource("clipboard"), "clipboard");
    assert.equal(normalizeCaptureSource("nope"), "selection-then-clipboard");
  });

  it("detects accessibility failures", () => {
    assert.equal(isAccessibilityError(new Error("Raycast is not a trusted accessibility client")), true);
    assert.equal(isAccessibilityError(new Error("Could not get the selected text")), false);
  });

  it("previews a single line and marks blank text", () => {
    assert.equal(previewTitle("  hello\nworld  "), "hello world");
    assert.equal(previewTitle("   \n"), "Blank text");
    assert.equal(previewTitle("abcdef", 4), "abc…");
  });

  it("formats character counts", () => {
    assert.equal(formatSize("a"), "1 char");
    assert.equal(formatSize("ab"), "2 chars");
    assert.equal(formatSize("a".repeat(1500)), "1.5k chars");
  });

  it("wraps slot text in a fence that the text itself does not close", () => {
    assert.match(slotMarkdown(undefined), /Empty/);
    assert.equal(slotMarkdown("hello"), "```\nhello\n```");
    assert.equal(slotMarkdown("has ``` inside"), "````\nhas ``` inside\n````");
    assert.equal(slotMarkdown("a `b` c"), "```\na `b` c\n```");
    const longRun = "`".repeat(5000);
    const fence = "`".repeat(5001);
    assert.equal(slotMarkdown(longRun), `${fence}\n${longRun}\n${fence}`);
  });
});
