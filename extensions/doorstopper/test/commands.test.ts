import { beforeEach, describe, expect, it, vi } from "vitest";
import toggle from "../src/toggle";
import enableCommand from "../src/enable";
import disableCommand from "../src/disable";
import status from "../src/status";
import type { Status } from "../src/lib/session";

const mocks = vi.hoisted(() => ({
  showHUD: vi.fn(),
  showToast: vi.fn(),
  updateCommandMetadata: vi.fn(),
  showFailureToast: vi.fn(),
  enable: vi.fn(),
  disable: vi.fn(),
  getDefaultMinutes: vi.fn(),
  getStatus: vi.fn(),
  isSleepDisabled: vi.fn(),
}));

vi.mock("@raycast/api", () => ({
  showHUD: mocks.showHUD,
  showToast: mocks.showToast,
  updateCommandMetadata: mocks.updateCommandMetadata,
  Toast: { Style: { Failure: "failure" } },
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
  getStatus: mocks.getStatus,
}));

vi.mock("../src/lib/system", () => ({
  isSleepDisabled: mocks.isSleepDisabled,
}));

const NOW = new Date("2024-10-11T09:00:00Z").getTime();
const BATTERY = { hasBattery: true, percent: 80, onAC: true };

function cancelled(): Error {
  return Object.assign(new Error("Doorstopper was not changed"), { name: "AuthenticationCanceledError" });
}

const CANCELLED_TOAST = {
  style: "failure",
  title: "Authentication canceled",
  message: "Doorstopper was not changed",
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.useRealTimers();
  mocks.enable.mockResolvedValue(undefined);
  mocks.disable.mockResolvedValue(undefined);
  mocks.showHUD.mockResolvedValue(undefined);
  mocks.showToast.mockResolvedValue(undefined);
  mocks.updateCommandMetadata.mockResolvedValue(undefined);
  mocks.showFailureToast.mockResolvedValue(undefined);
  mocks.getDefaultMinutes.mockReturnValue(null);
  mocks.isSleepDisabled.mockResolvedValue(false);
});

describe("toggle command", () => {
  it("disables Doorstopper when sleep is disabled", async () => {
    mocks.isSleepDisabled.mockResolvedValue(true);

    await toggle();

    expect(mocks.disable).toHaveBeenCalledTimes(1);
    expect(mocks.enable).not.toHaveBeenCalled();
    expect(mocks.showHUD).toHaveBeenCalledWith("Doorstopper is now disabled");
  });

  it("enables Doorstopper until disabled when the default is Indefinitely, as Toggle always did", async () => {
    await toggle();

    expect(mocks.enable).toHaveBeenCalledWith(null);
    expect(mocks.disable).not.toHaveBeenCalled();
    expect(mocks.showHUD).toHaveBeenCalledWith("Doorstopper is now enabled");
  });

  it("enables Doorstopper for the default duration when one is set", async () => {
    mocks.getDefaultMinutes.mockReturnValue(60);

    await toggle();

    expect(mocks.enable).toHaveBeenCalledWith(60);
    expect(mocks.showHUD).toHaveBeenCalledWith("Doorstopper is now enabled for 1 hour");
  });

  it("shows a failure toast and no HUD when enabling fails", async () => {
    const error = new Error("Run Set up Passwordless Doorstopper first");
    mocks.enable.mockRejectedValue(error);

    await toggle();

    expect(mocks.showFailureToast).toHaveBeenCalledWith(error, { title: "Failed to toggle Doorstopper" });
    expect(mocks.showHUD).not.toHaveBeenCalled();
  });

  it("shows a failure toast and no HUD when disabling fails", async () => {
    const error = new Error("sudo failed");
    mocks.isSleepDisabled.mockResolvedValue(true);
    mocks.disable.mockRejectedValue(error);

    await toggle();

    expect(mocks.showFailureToast).toHaveBeenCalledWith(error, { title: "Failed to toggle Doorstopper" });
    expect(mocks.showHUD).not.toHaveBeenCalled();
  });

  it("shows a failure toast and changes nothing when reading the sleep state fails", async () => {
    const error = new Error("pmset not found");
    mocks.isSleepDisabled.mockRejectedValue(error);

    await toggle();

    expect(mocks.showFailureToast).toHaveBeenCalledWith(error, { title: "Failed to toggle Doorstopper" });
    expect(mocks.enable).not.toHaveBeenCalled();
    expect(mocks.disable).not.toHaveBeenCalled();
    expect(mocks.showHUD).not.toHaveBeenCalled();
  });

  it("shows the authentication canceled notice instead of an error when the prompt is cancelled", async () => {
    mocks.enable.mockRejectedValue(cancelled());

    await toggle();

    expect(mocks.showToast).toHaveBeenCalledWith(CANCELLED_TOAST);
    expect(mocks.showFailureToast).not.toHaveBeenCalled();
    expect(mocks.showHUD).not.toHaveBeenCalled();
  });
});

describe("enable command", () => {
  it("enables Doorstopper until disabled, then shows the enabled message", async () => {
    mocks.getDefaultMinutes.mockReturnValue(60);

    await enableCommand();

    expect(mocks.enable).toHaveBeenCalledWith(null);
    expect(mocks.showHUD).toHaveBeenCalledWith("Doorstopper is now enabled");
    expect(mocks.enable.mock.invocationCallOrder[0]).toBeLessThan(mocks.showHUD.mock.invocationCallOrder[0]);
  });

  it("shows a failure toast and no HUD when enabling fails", async () => {
    const error = new Error("Battery is at 15%, at or below your 20% cutoff");
    mocks.enable.mockRejectedValue(error);

    await enableCommand();

    expect(mocks.showFailureToast).toHaveBeenCalledWith(error, { title: "Failed to enable Doorstopper" });
    expect(mocks.showHUD).not.toHaveBeenCalled();
  });

  it("shows the authentication canceled notice when the prompt is cancelled", async () => {
    mocks.enable.mockRejectedValue(cancelled());

    await enableCommand();

    expect(mocks.showToast).toHaveBeenCalledWith(CANCELLED_TOAST);
    expect(mocks.showFailureToast).not.toHaveBeenCalled();
  });
});

describe("disable command", () => {
  it("disables Doorstopper, then shows the disabled message", async () => {
    await disableCommand();

    expect(mocks.disable).toHaveBeenCalledTimes(1);
    expect(mocks.enable).not.toHaveBeenCalled();
    expect(mocks.showHUD).toHaveBeenCalledWith("Doorstopper is now disabled");
    expect(mocks.disable.mock.invocationCallOrder[0]).toBeLessThan(mocks.showHUD.mock.invocationCallOrder[0]);
  });

  it("shows a failure toast and no HUD when disabling fails", async () => {
    const error = new Error("sudo failed");
    mocks.disable.mockRejectedValue(error);

    await disableCommand();

    expect(mocks.showFailureToast).toHaveBeenCalledWith(error, { title: "Failed to disable Doorstopper" });
    expect(mocks.showHUD).not.toHaveBeenCalled();
  });

  it("shows the authentication canceled notice when the prompt is cancelled", async () => {
    mocks.disable.mockRejectedValue(cancelled());

    await disableCommand();

    expect(mocks.showToast).toHaveBeenCalledWith(CANCELLED_TOAST);
    expect(mocks.showFailureToast).not.toHaveBeenCalled();
  });
});

describe("status command", () => {
  function statusWith(overrides: Partial<Status>): Status {
    return { on: false, session: null, battery: BATTERY, ...overrides };
  }

  it("shows disabled when sleep is allowed", async () => {
    mocks.getStatus.mockResolvedValue(statusWith({ on: false }));

    await status();

    expect(mocks.updateCommandMetadata).toHaveBeenCalledWith({ subtitle: "✖ Disabled" });
  });

  it("shows enabled for an indefinite session", async () => {
    mocks.getStatus.mockResolvedValue(statusWith({ on: true, session: { startedAt: NOW, endsAt: null, bootTime: 1 } }));

    await status();

    expect(mocks.updateCommandMetadata).toHaveBeenCalledWith({ subtitle: "✔ Enabled" });
  });

  it("shows the time left for a timed session", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    mocks.getStatus.mockResolvedValue(
      statusWith({ on: true, session: { startedAt: NOW, endsAt: NOW + 45 * 60_000, bootTime: 1 } }),
    );

    await status();

    expect(mocks.updateCommandMetadata).toHaveBeenCalledWith({ subtitle: "✔ Enabled, 45m left" });
  });

  it("shows disabled when the status cannot be read, as Doorstopper always did", async () => {
    mocks.getStatus.mockRejectedValue(new Error("pmset not found"));
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    await status();

    expect(mocks.updateCommandMetadata).toHaveBeenCalledWith({ subtitle: "✖ Disabled" });
  });
});
