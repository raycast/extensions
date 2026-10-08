import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockState, resetMockState } from "./mocks/raycast-api";

const hasClipboardImage = vi.fn<() => Promise<boolean>>();
vi.mock("../src/lib/clipboard-image", () => ({
  hasClipboardImage: () => hasClipboardImage(),
}));

const { findImageInput, pickImageFile, readTextInput, toFilePath } = await import("../src/lib/sources");

beforeEach(() => {
  resetMockState();
  hasClipboardImage.mockReset();
  hasClipboardImage.mockResolvedValue(false);
});

describe("readTextInput", () => {
  it("prefers the selected text", async () => {
    mockState.selectedText = "Selected words";
    mockState.clipboardText = "Copied words";
    expect(await readTextInput()).toEqual({ text: "Selected words", origin: "selection" });
  });

  it("uses the clipboard when nothing is selected", async () => {
    mockState.clipboardText = "Copied words";
    expect(await readTextInput()).toEqual({ text: "Copied words", origin: "clipboard" });
  });

  it("uses the clipboard when the selection is only whitespace", async () => {
    mockState.selectedText = "   ";
    mockState.clipboardText = "Copied words";
    expect((await readTextInput())?.origin).toBe("clipboard");
  });

  it("does not use the clipboard when the preference is off", async () => {
    mockState.clipboardText = "Copied words";
    mockState.preferences = { useClipboard: false };
    expect(await readTextInput()).toBeUndefined();
  });

  it("returns nothing when there is no text anywhere", async () => {
    mockState.clipboardText = "  ";
    expect(await readTextInput()).toBeUndefined();
  });
});

describe("pickImageFile and toFilePath", () => {
  it("prefers an image selected in Finder over the clipboard file", () => {
    expect(pickImageFile(["/a/notes.txt", "/a/photo.jpg"], "/b/copied.png")).toEqual({
      path: "/a/photo.jpg",
      origin: "finder",
    });
  });

  it("uses a copied image file, also as a file URL", () => {
    expect(pickImageFile([], "file:///Users/ada/My%20Pictures/cat.png")).toEqual({
      path: "/Users/ada/My Pictures/cat.png",
      origin: "clipboard-file",
    });
    expect(toFilePath("/plain/path.png")).toBe("/plain/path.png");
  });

  it("ignores files that are not images", () => {
    expect(pickImageFile(["/a/report.pdf"], "/b/notes.txt")).toBeUndefined();
  });
});

describe("findImageInput", () => {
  it("checks Finder first when Finder is the frontmost app", async () => {
    mockState.frontmostBundleId = "com.apple.finder";
    mockState.finderPaths = ["/a/photo.heic"];
    mockState.clipboardFile = "/b/copied.png";
    expect(await findImageInput()).toEqual({ path: "/a/photo.heic", origin: "finder" });
    expect(hasClipboardImage).not.toHaveBeenCalled();
  });

  it("does not ask Finder when another app is in front, so macOS shows no permission prompt", async () => {
    mockState.frontmostBundleId = "com.apple.TextEdit";
    mockState.finderPaths = ["/a/photo.heic"];
    mockState.clipboardFile = "/b/copied.png";
    expect(await findImageInput()).toEqual({ path: "/b/copied.png", origin: "clipboard-file" });
  });

  it("then a copied image file", async () => {
    mockState.clipboardFile = "/b/copied.png";
    expect(await findImageInput()).toEqual({ path: "/b/copied.png", origin: "clipboard-file" });
    expect(hasClipboardImage).not.toHaveBeenCalled();
  });

  it("then image data on the clipboard, without saving it yet", async () => {
    hasClipboardImage.mockResolvedValue(true);
    expect(await findImageInput()).toEqual({ origin: "clipboard-image" });
  });

  it("returns nothing when there is no image", async () => {
    expect(await findImageInput()).toBeUndefined();
  });
});
