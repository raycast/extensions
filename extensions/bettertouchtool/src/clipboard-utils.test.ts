import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ClipboardManagerItem } from "bettertouchtool";
import { formatClipboardItemDate, getClipboardItemText, getClipboardItemTitle } from "./clipboard-utils";

function clipboardItem(content: unknown, previewText?: string): ClipboardManagerItem {
  return { meta: { uuid: "item", previewText }, content };
}

describe("BTT clipboard item formatting", () => {
  it("uses full text content for copying and the metadata preview for display", () => {
    const item = clipboardItem("Full clipboard content", "Full preview");
    assert.equal(getClipboardItemText(item), "Full clipboard content");
    assert.equal(getClipboardItemTitle(item), "Full preview");
  });

  it("collapses whitespace, truncates previews, and labels non-text items", () => {
    assert.equal(getClipboardItemTitle(clipboardItem("first\n  second")), "first second");
    assert.equal(getClipboardItemTitle(clipboardItem("123456789"), 6), "12345…");
    assert.equal(getClipboardItemTitle(clipboardItem({ image: true })), "Non-text clipboard item");
    assert.equal(getClipboardItemText(clipboardItem({ image: true }, "Image preview")), "");
  });

  it("preserves unrecognized date values", () => {
    assert.equal(formatClipboardItemDate(undefined), undefined);
    assert.equal(formatClipboardItemDate("not-a-date"), "not-a-date");
  });
});
