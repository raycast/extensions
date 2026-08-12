import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  closeMainWindow: vi.fn(),
  execFile: vi.fn(),
  foregroundOpen: vi.fn(),
  showHUD: vi.fn(),
}));

vi.mock("@raycast/api", () => ({
  closeMainWindow: mocks.closeMainWindow,
  open: mocks.foregroundOpen,
  showHUD: mocks.showHUD,
}));

vi.mock("node:child_process", () => ({
  execFile: mocks.execFile,
}));

import { launchScreenLexAction } from "./launch";

describe("launchScreenLexAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.closeMainWindow.mockResolvedValue(undefined);
    mocks.execFile.mockImplementation(
      (
        _executable: string,
        _arguments: string[],
        callback: (error: Error | null) => void,
      ) => {
        callback(null);
      },
    );
  });

  it("opens the deep link without activating ScreenLex", async () => {
    await launchScreenLexAction("capture-full-screen");

    expect(mocks.execFile).toHaveBeenCalledWith(
      "/usr/bin/open",
      ["-g", "screenlex-v1://capture/full-screen"],
      expect.any(Function),
    );
    expect(mocks.foregroundOpen).not.toHaveBeenCalled();
  });

  it("shows the update HUD when background URL dispatch fails", async () => {
    mocks.execFile.mockImplementationOnce(
      (
        _executable: string,
        _arguments: string[],
        callback: (error: Error | null) => void,
      ) => {
        callback(new Error("No application can open the URL"));
      },
    );

    await launchScreenLexAction("open-library");

    expect(mocks.showHUD).toHaveBeenCalledWith(
      "Update ScreenLex to a version with Raycast support",
    );
  });
});
