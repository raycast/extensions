import { beforeEach, describe, expect, it, vi } from "vitest";

const raycast = vi.hoisted(() => ({
  closeMainWindow: vi.fn(),
  showHUD: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock("@raycast/api", () => ({
  closeMainWindow: raycast.closeMainWindow,
  showHUD: raycast.showHUD,
  showToast: raycast.showToast,
  Toast: { Style: { Failure: "failure" } },
}));

import { runViewAction, runWindowCommand } from "../src/window-command";

describe("window command feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a HUD after a successful window request", async () => {
    const operation = vi.fn().mockResolvedValue(undefined);

    await runWindowCommand(operation, "Opened", "Failed");

    expect(operation).toHaveBeenCalledOnce();
    expect(raycast.showHUD).toHaveBeenCalledWith("Opened");
    expect(raycast.showToast).not.toHaveBeenCalled();
  });

  it("shows a failure toast without leaking non-error values", async () => {
    const operation = vi.fn().mockRejectedValue({ privateData: "hidden" });

    await runWindowCommand(operation, "Opened", "Failed");

    expect(raycast.showHUD).not.toHaveBeenCalled();
    expect(raycast.showToast).toHaveBeenCalledWith({
      style: "failure",
      title: "Failed",
      message: "Try again.",
    });
  });

  it("closes the Raycast window after a successful view action", async () => {
    const operation = vi.fn().mockResolvedValue(undefined);

    await runViewAction(operation, "Failed", "Try again.");

    expect(operation).toHaveBeenCalledOnce();
    expect(raycast.closeMainWindow).toHaveBeenCalledOnce();
    expect(raycast.showToast).not.toHaveBeenCalled();
    expect(operation.mock.invocationCallOrder[0]).toBeLessThan(
      raycast.closeMainWindow.mock.invocationCallOrder[0],
    );
  });

  it("keeps the Raycast window open when a view action fails", async () => {
    const operation = vi.fn().mockRejectedValue({ privateData: "hidden" });

    await runViewAction(operation, "Failed", "Try refreshing.");

    expect(raycast.closeMainWindow).not.toHaveBeenCalled();
    expect(raycast.showToast).toHaveBeenCalledWith({
      style: "failure",
      title: "Failed",
      message: "Try refreshing.",
    });
  });
});
