import { describe, expect, it, vi } from "vitest";
import { localPreviewSource } from "../src/local-preview";

describe("localPreviewSource", () => {
  it("uses an absolute path on macOS", () => {
    const toFileUrl = vi.fn();

    expect(localPreviewSource("/Users/test/a.gif", "darwin", toFileUrl)).toBe(
      "/Users/test/a.gif",
    );
    expect(toFileUrl).not.toHaveBeenCalled();
  });

  it("uses a file URL on Windows", () => {
    const toFileUrl = vi.fn(() => "file:///C:/Users/test/a.gif");

    expect(
      localPreviewSource("C:\\Users\\test\\a.gif", "win32", toFileUrl),
    ).toBe("file:///C:/Users/test/a.gif");
    expect(toFileUrl).toHaveBeenCalledWith("C:\\Users\\test\\a.gif");
  });
});
