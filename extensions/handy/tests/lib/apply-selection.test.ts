import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";

const { restartHandyActionMock } = vi.hoisted(() => ({
  restartHandyActionMock: vi.fn(),
}));

vi.mock("../../src/lib/restart-handy", () => ({
  restartHandyAction: restartHandyActionMock,
}));

import { applyLiveOrRestart } from "../../src/lib/apply-selection";

const BINARY_PATH = "/Applications/Handy.app/Contents/MacOS/Handy";

describe("applyLiveOrRestart", () => {
  const persist = vi.fn();
  const markCurrent = vi.fn();
  const liveSwitch = vi.fn();

  beforeEach(() => {
    persist.mockReset();
    markCurrent.mockReset();
    liveSwitch.mockReset();
    restartHandyActionMock.mockReset();
    vi.mocked(showHUD).mockReset();
    vi.mocked(showToast).mockReset();
    vi.mocked(getPreferenceValues).mockReturnValue({
      handyBinaryPath: BINARY_PATH,
    });
    restartHandyActionMock.mockReturnValue({
      title: "Restart Handy",
      onAction: vi.fn(),
    });
  });

  it("skips persist when the selection is already current", async () => {
    await applyLiveOrRestart({
      isCurrent: true,
      alreadyActiveMessage: "Turbo is already active",
      persist,
      markCurrent,
      liveSwitch,
      successMessage: "Model changed to Turbo",
      failureTitle: "Couldn't switch model in Handy",
    });

    expect(liveSwitch).not.toHaveBeenCalled();
    expect(persist).not.toHaveBeenCalled();
    expect(markCurrent).not.toHaveBeenCalled();
    expect(showHUD).toHaveBeenCalledWith("Turbo is already active");
    expect(showToast).not.toHaveBeenCalled();
  });

  it("persists only after the running app accepts the live switch", async () => {
    liveSwitch.mockImplementation(async () => {
      expect(persist).not.toHaveBeenCalled();
      expect(markCurrent).not.toHaveBeenCalled();
      return true;
    });

    await applyLiveOrRestart({
      isCurrent: false,
      alreadyActiveMessage: "Turbo is already active",
      persist,
      markCurrent,
      liveSwitch,
      successMessage: "Model changed to Turbo",
      failureTitle: "Couldn't switch model in Handy",
    });

    expect(persist).toHaveBeenCalledTimes(1);
    expect(markCurrent).toHaveBeenCalledTimes(1);
    expect(showHUD).toHaveBeenCalledWith("Model changed to Turbo");
    expect(showToast).not.toHaveBeenCalled();
  });

  it("leaves persist and current unchanged when the live switch fails", async () => {
    liveSwitch.mockResolvedValue(false);

    await applyLiveOrRestart({
      isCurrent: false,
      alreadyActiveMessage: "Turbo is already active",
      persist,
      markCurrent,
      liveSwitch,
      successMessage: "Model changed to Turbo",
      failureTitle: "Couldn't switch model in Handy",
    });

    expect(persist).not.toHaveBeenCalled();
    expect(markCurrent).not.toHaveBeenCalled();
    expect(showHUD).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith({
      style: Toast.Style.Failure,
      title: "Couldn't switch model in Handy",
      message:
        "Grant Raycast Accessibility access (System Settings → Privacy & Security), or restart Handy to apply.",
      primaryAction: { title: "Restart Handy", onAction: expect.any(Function) },
    });
    expect(restartHandyActionMock).toHaveBeenCalledWith(
      persist,
      BINARY_PATH,
      markCurrent,
    );
  });
});
