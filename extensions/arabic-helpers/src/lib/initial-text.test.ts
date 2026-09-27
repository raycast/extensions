import { Clipboard, getSelectedText } from "@raycast/api";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getInitialText } from "./initial-text";

vi.mock("@raycast/api", () => ({
  Clipboard: {
    readText: vi.fn(),
  },
  getSelectedText: vi.fn(),
}));

const mockedGetSelectedText = vi.mocked(getSelectedText);
const mockedReadClipboardText = vi.mocked(Clipboard.readText);

describe("initial text loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts empty without reading selection or clipboard when automatic loading is disabled", async () => {
    await expect(getInitialText(false)).resolves.toBe("");
    expect(mockedGetSelectedText).not.toHaveBeenCalled();
    expect(mockedReadClipboardText).not.toHaveBeenCalled();
  });

  it("uses selected text first when automatic loading is enabled", async () => {
    mockedGetSelectedText.mockResolvedValue("selected");

    await expect(getInitialText(true)).resolves.toBe("selected");
    expect(mockedReadClipboardText).not.toHaveBeenCalled();
  });

  it("falls back to clipboard when selected text is unavailable", async () => {
    mockedGetSelectedText.mockRejectedValue(new Error("No selected text"));
    mockedReadClipboardText.mockResolvedValue("clipboard");

    await expect(getInitialText(true)).resolves.toBe("clipboard");
  });
});
