import { beforeEach, describe, expect, it, vi } from "vitest";
import toggle from "../src/toggle";
import stop from "../src/stop";

const mocks = vi.hoisted(() => ({
  showHUD: vi.fn(),
  showFailureToast: vi.fn(),
  enable: vi.fn(),
  disable: vi.fn(),
  getDefaultMinutes: vi.fn(),
  isSleepDisabled: vi.fn(),
}));

vi.mock("@raycast/api", () => ({
  showHUD: mocks.showHUD,
}));

vi.mock("@raycast/utils", () => ({
  showFailureToast: mocks.showFailureToast,
}));

// Keep the real durationLabel and replace only the functions that touch Raycast storage and the system.
vi.mock("../src/lib/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/lib/session")>()),
  enable: mocks.enable,
  disable: mocks.disable,
  getDefaultMinutes: mocks.getDefaultMinutes,
}));

vi.mock("../src/lib/system", () => ({
  isSleepDisabled: mocks.isSleepDisabled,
}));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.enable.mockResolvedValue(undefined);
  mocks.disable.mockResolvedValue(undefined);
  mocks.showHUD.mockResolvedValue(undefined);
  mocks.showFailureToast.mockResolvedValue(undefined);
  mocks.getDefaultMinutes.mockReturnValue(60);
  mocks.isSleepDisabled.mockResolvedValue(false);
});

describe("toggle command", () => {
  it("turns Lid Awake off when sleep is disabled", async () => {
    mocks.isSleepDisabled.mockResolvedValue(true);

    await toggle();

    expect(mocks.disable).toHaveBeenCalledTimes(1);
    expect(mocks.enable).not.toHaveBeenCalled();
    expect(mocks.showHUD).toHaveBeenCalledWith("Lid Awake off");
  });

  it("turns Lid Awake on for the default duration when sleep is not disabled", async () => {
    mocks.getDefaultMinutes.mockReturnValue(60);

    await toggle();

    expect(mocks.enable).toHaveBeenCalledWith(60);
    expect(mocks.disable).not.toHaveBeenCalled();
    expect(mocks.showHUD).toHaveBeenCalledWith("Lid Awake on for 1 hour");
  });

  it("turns Lid Awake on until turned off when the default is Indefinitely", async () => {
    mocks.getDefaultMinutes.mockReturnValue(null);

    await toggle();

    expect(mocks.enable).toHaveBeenCalledWith(null);
    expect(mocks.showHUD).toHaveBeenCalledWith("Lid Awake on until you turn it off");
  });

  it("shows a failure toast and no HUD when turning on fails", async () => {
    const error = new Error("Run Set up Lid Awake first");
    mocks.enable.mockRejectedValue(error);

    await toggle();

    expect(mocks.showFailureToast).toHaveBeenCalledWith(error, { title: "Could not toggle Lid Awake" });
    expect(mocks.showHUD).not.toHaveBeenCalled();
  });

  it("shows a failure toast and no HUD when turning off fails", async () => {
    const error = new Error("sudo failed");
    mocks.isSleepDisabled.mockResolvedValue(true);
    mocks.disable.mockRejectedValue(error);

    await toggle();

    expect(mocks.showFailureToast).toHaveBeenCalledWith(error, { title: "Could not toggle Lid Awake" });
    expect(mocks.showHUD).not.toHaveBeenCalled();
  });

  it("shows a failure toast and no HUD when reading the sleep state fails", async () => {
    const error = new Error("pmset not found");
    mocks.isSleepDisabled.mockRejectedValue(error);

    await toggle();

    expect(mocks.showFailureToast).toHaveBeenCalledWith(error, { title: "Could not toggle Lid Awake" });
    expect(mocks.enable).not.toHaveBeenCalled();
    expect(mocks.disable).not.toHaveBeenCalled();
    expect(mocks.showHUD).not.toHaveBeenCalled();
  });
});

describe("stop command", () => {
  it("turns Lid Awake off, then shows the sleep message", async () => {
    await stop();

    expect(mocks.disable).toHaveBeenCalledTimes(1);
    expect(mocks.enable).not.toHaveBeenCalled();
    expect(mocks.showHUD).toHaveBeenCalledWith("Lid Awake off, your Mac can sleep normally");
    expect(mocks.disable.mock.invocationCallOrder[0]).toBeLessThan(mocks.showHUD.mock.invocationCallOrder[0]);
  });

  it("shows a failure toast and no HUD when turning off fails", async () => {
    const error = new Error("sudo failed");
    mocks.disable.mockRejectedValue(error);

    await stop();

    expect(mocks.showFailureToast).toHaveBeenCalledWith(error, { title: "Could not turn off Lid Awake" });
    expect(mocks.showHUD).not.toHaveBeenCalled();
  });
});
