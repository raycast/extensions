import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@raycast/api", () => ({
  closeMainWindow: vi.fn().mockResolvedValue(undefined),
  open: vi.fn().mockResolvedValue(undefined),
  showHUD: vi.fn().mockResolvedValue(undefined),
}));

import { closeMainWindow, open, showHUD } from "@raycast/api";
import manifest from "../package.json";

const routes = {
  "capture-region": "capture/region",
  "capture-fullscreen": "capture/fullscreen",
  "capture-window": "capture/window",
  "scan-text": "ocr",
  "pick-color": "color-picker",
  "record-screen": "record",
  "open-settings": "settings",
};

beforeEach(() => vi.clearAllMocks());

describe("BetterShot commands", () => {
  it.each(Object.entries(routes))(
    "%s closes Raycast before dispatching %s",
    async (name, route) => {
      const command = await import(`../src/${name}.ts`);
      await command.default();
      expect(manifest.commands.find((item) => item.name === name)?.mode).toBe(
        "no-view",
      );
      expect(closeMainWindow).toHaveBeenCalledWith({ clearRootSearch: true });
      expect(open).toHaveBeenCalledExactlyOnceWith(`bettershot://${route}`);
      expect(
        vi.mocked(closeMainWindow).mock.invocationCallOrder[0],
      ).toBeLessThan(vi.mocked(open).mock.invocationCallOrder[0]);
      expect(showHUD).not.toHaveBeenCalled();
    },
  );

  it("waits until Raycast has closed before opening BetterShot", async () => {
    let finishClosing!: () => void;
    vi.mocked(closeMainWindow).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishClosing = resolve;
        }),
    );
    const { default: command } = await import("../src/capture-region");
    const pending = command();
    expect(open).not.toHaveBeenCalled();
    finishClosing();
    await pending;
    expect(open).toHaveBeenCalledOnce();
  });

  it("shows actionable feedback when the URL cannot be opened", async () => {
    vi.mocked(open).mockRejectedValueOnce(new Error("No URL handler"));
    const { default: command } = await import("../src/capture-region");
    await expect(command()).resolves.toBeUndefined();
    expect(showHUD).toHaveBeenCalledWith(
      expect.stringContaining("Check that it is installed"),
    );
  });

  it("does not capture if Raycast fails to close", async () => {
    vi.mocked(closeMainWindow).mockRejectedValueOnce(new Error("Window error"));
    const { default: command } = await import("../src/capture-region");
    await command();
    expect(open).not.toHaveBeenCalled();
    expect(showHUD).toHaveBeenCalledOnce();
  });
});
