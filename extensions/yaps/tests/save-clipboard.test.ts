import { mock, afterEach, describe, expect, test } from "bun:test";

const toastRecords: Array<Record<string, unknown>> = [];
const readText = mock(async () => " \n\t");
const createClipboardNote = mock(async () => {
  throw new Error("createClipboardNote must not be called for an empty clipboard");
});

mock.module("@raycast/api", () => ({
  Clipboard: { readText },
  Toast: { Style: { Animated: "animated", Failure: "failure", Success: "success" } },
  getPreferenceValues: () => ({ captureFolder: "Inbox" }),
  openExtensionPreferences: mock(() => {}),
  showToast: mock(async (options: Record<string, unknown>) => {
    const toast = { ...options };
    toastRecords.push(toast);
    return toast;
  }),
}));

mock.module("../src/lib/yaps-app", () => ({
  openYapsWithFallback: mock(async () => {}),
}));

mock.module("../src/lib/yaps-cli", () => ({
  YapsCliNotFoundError: class YapsCliNotFoundError extends Error {},
  createClipboardNote,
}));

const { default: saveClipboard } = await import("../src/save-clipboard");

afterEach(() => {
  readText.mockClear();
  createClipboardNote.mockClear();
  toastRecords.length = 0;
});

describe("Save Clipboard command", () => {
  test("reports whitespace-only clipboard content without invoking the CLI", async () => {
    await saveClipboard();

    expect(readText).toHaveBeenCalledTimes(1);
    expect(createClipboardNote).not.toHaveBeenCalled();
    expect(toastRecords.at(-1)).toMatchObject({
      style: "failure",
      title: "Clipboard is empty",
      message: "Copy some text, then try again.",
    });
  });
});
