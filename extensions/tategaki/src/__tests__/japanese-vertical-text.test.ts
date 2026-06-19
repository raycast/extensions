import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSelectedText, Clipboard, showToast } from "@raycast/api";
import { getInputText, MAX_INPUT_SIZE } from "../japanese-vertical-text";

const mockedGetSelectedText = vi.mocked(getSelectedText);
const mockedClipboardReadText = vi.mocked(Clipboard.readText);
const mockedShowToast = vi.mocked(showToast);

describe("getInputText", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns selected text when available", async () => {
    mockedGetSelectedText.mockResolvedValue("selected text");

    const result = await getInputText();

    expect(result).toEqual({ text: "selected text", source: "selected" });
    expect(mockedClipboardReadText).not.toHaveBeenCalled();
  });

  it("falls back to clipboard when no selection", async () => {
    mockedGetSelectedText.mockRejectedValue(new Error("No selection"));
    mockedClipboardReadText.mockResolvedValue("clipboard text");

    const result = await getInputText();

    expect(result).toEqual({ text: "clipboard text", source: "clipboard" });
  });

  it("falls back to clipboard when selection is empty", async () => {
    mockedGetSelectedText.mockResolvedValue("");
    mockedClipboardReadText.mockResolvedValue("clipboard text");

    const result = await getInputText();

    expect(result).toEqual({ text: "clipboard text", source: "clipboard" });
  });

  it("falls back to clipboard when selection is whitespace only", async () => {
    mockedGetSelectedText.mockResolvedValue("   ");
    mockedClipboardReadText.mockResolvedValue("clipboard text");

    const result = await getInputText();

    expect(result).toEqual({ text: "clipboard text", source: "clipboard" });
  });

  it("returns empty when both are unavailable", async () => {
    mockedGetSelectedText.mockRejectedValue(new Error("No selection"));
    mockedClipboardReadText.mockResolvedValue(undefined);

    const result = await getInputText();

    expect(result).toEqual({ text: "", source: "none" });
  });

  it("returns empty when clipboard is empty string", async () => {
    mockedGetSelectedText.mockRejectedValue(new Error("No selection"));
    mockedClipboardReadText.mockResolvedValue("");

    const result = await getInputText();

    expect(result).toEqual({ text: "", source: "none" });
  });

  it("shows error when selected text exceeds size limit", async () => {
    const largeText = "a".repeat(MAX_INPUT_SIZE + 1);
    mockedGetSelectedText.mockResolvedValue(largeText);

    const result = await getInputText();

    expect(result).toEqual({ text: "", source: "none" });
    expect(mockedShowToast).toHaveBeenCalledWith({
      style: "failure",
      title: "Text Too Large",
      message: `Maximum ${MAX_INPUT_SIZE.toLocaleString()} characters`,
    });
  });

  it("shows error when clipboard text exceeds size limit", async () => {
    const largeText = "a".repeat(MAX_INPUT_SIZE + 1);
    mockedGetSelectedText.mockRejectedValue(new Error("No selection"));
    mockedClipboardReadText.mockResolvedValue(largeText);

    const result = await getInputText();

    expect(result).toEqual({ text: "", source: "none" });
    expect(mockedShowToast).toHaveBeenCalledWith({
      style: "failure",
      title: "Text Too Large",
      message: `Maximum ${MAX_INPUT_SIZE.toLocaleString()} characters`,
    });
  });

  it("trims leading and trailing empty lines from selected text", async () => {
    mockedGetSelectedText.mockResolvedValue("\n\ntext\n\n");

    const result = await getInputText();

    expect(result).toEqual({ text: "text", source: "selected" });
  });

  it("trims leading and trailing empty lines from clipboard text", async () => {
    mockedGetSelectedText.mockRejectedValue(new Error("No selection"));
    mockedClipboardReadText.mockResolvedValue("\n\ntext\n\n");

    const result = await getInputText();

    expect(result).toEqual({ text: "text", source: "clipboard" });
  });

  it("shows toast for unexpected errors from getSelectedText", async () => {
    mockedGetSelectedText.mockRejectedValue(new Error("Permission denied"));
    mockedClipboardReadText.mockResolvedValue("clipboard text");

    const result = await getInputText();

    expect(result).toEqual({ text: "clipboard text", source: "clipboard" });
    expect(mockedShowToast).toHaveBeenCalledWith({
      style: "failure",
      title: "Error Reading Selection",
      message: "Permission denied",
    });
  });

  it("does not show toast when getSelectedText throws no-selection error", async () => {
    mockedGetSelectedText.mockRejectedValue(new Error("Unable to get selected text"));
    mockedClipboardReadText.mockResolvedValue("clipboard text");

    const result = await getInputText();

    expect(result).toEqual({ text: "clipboard text", source: "clipboard" });
    expect(mockedShowToast).not.toHaveBeenCalled();
  });
});
