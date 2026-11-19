import { beforeEach, describe, expect, it, vi } from "vitest";

import { applyTheme } from "./theme-change";

// applyTheme deletes the user's color settings, so every branch that decides whether it may, and
// what the user is told after a partial failure, runs here against mocked Raycast and Otty calls.
const { confirmAlert, showFailure, loadThemeOverrides, changeSetting, loadAutoDarkMode, applySetting } = vi.hoisted(
  () => ({
    confirmAlert: vi.fn<(options: { message: string }) => Promise<boolean>>(),
    showFailure: vi.fn<(title: string, error: unknown) => Promise<void>>(),
    loadThemeOverrides: vi.fn<() => Promise<string[]>>(),
    changeSetting: vi.fn<(args: string[]) => Promise<void>>(),
    loadAutoDarkMode: vi.fn<() => Promise<boolean>>(),
    applySetting:
      vi.fn<
        (
          args: string[],
          success: { title: string; message?: string },
          failure: string,
          onChange: () => void,
        ) => Promise<boolean>
      >(),
  }),
);

vi.mock("@raycast/api", () => ({
  Alert: { ActionStyle: { Destructive: "destructive" } },
  Icon: { Brush: "brush" },
  confirmAlert,
}));
vi.mock("./otty", () => ({ showFailure }));
vi.mock("./otty-config", () => ({ loadThemeOverrides, changeSetting, loadAutoDarkMode, applySetting }));

const UNSET_FOREGROUND = ["config", "unset", "foreground"];
const SET_DRACULA = ["config", "set", "theme-dark", "--", "Dracula"];

beforeEach(() => {
  vi.resetAllMocks();
  changeSetting.mockResolvedValue();
  loadAutoDarkMode.mockResolvedValue(true);
  applySetting.mockResolvedValue(true);
  showFailure.mockResolvedValue();
});

describe("applyTheme", () => {
  it("sets the theme without asking when the config sets no colors", async () => {
    loadThemeOverrides.mockResolvedValue([]);
    expect(await applyTheme("Dracula", "dark", vi.fn())).toBe(true);
    expect(confirmAlert).not.toHaveBeenCalled();
    expect(changeSetting).not.toHaveBeenCalled();
    expect(applySetting).toHaveBeenCalledWith(
      SET_DRACULA,
      expect.anything(),
      "Could not change theme",
      expect.any(Function),
    );
  });

  it("writes nothing when the user cancels the alert", async () => {
    loadThemeOverrides.mockResolvedValue(["foreground"]);
    confirmAlert.mockResolvedValue(false);
    expect(await applyTheme("Dracula", "dark", vi.fn())).toBe(false);
    expect(changeSetting).not.toHaveBeenCalled();
    expect(applySetting).not.toHaveBeenCalled();
  });

  it("resets the confirmed colors, then sets the theme and says what it reset", async () => {
    loadThemeOverrides.mockResolvedValue(["foreground"]);
    confirmAlert.mockResolvedValue(true);
    const onChange = vi.fn();
    expect(await applyTheme("Dracula", "dark", onChange)).toBe(true);
    expect(changeSetting).toHaveBeenCalledWith(UNSET_FOREGROUND);
    expect(onChange).toHaveBeenCalled();
    expect(applySetting).toHaveBeenCalledWith(
      SET_DRACULA,
      expect.objectContaining({ message: "Reset foreground." }),
      "Reset your custom colors, but could not change the theme",
      expect.any(Function),
    );
  });

  it("asks again before resetting a color that appeared after the user confirmed", async () => {
    loadThemeOverrides
      .mockResolvedValueOnce(["foreground"])
      .mockResolvedValueOnce(["foreground", "background"])
      .mockResolvedValueOnce(["foreground", "background"]);
    confirmAlert.mockResolvedValue(true);
    await applyTheme("Dracula", "dark", vi.fn());
    expect(confirmAlert).toHaveBeenCalledTimes(2);
    expect(confirmAlert.mock.calls[1][0].message).toContain("background");
    expect(changeSetting).toHaveBeenCalledWith(["config", "unset", "foreground", "background"]);
  });

  it("never resets the new color when the user cancels the second alert", async () => {
    loadThemeOverrides.mockResolvedValueOnce(["foreground"]).mockResolvedValueOnce(["foreground", "background"]);
    confirmAlert.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    expect(await applyTheme("Dracula", "dark", vi.fn())).toBe(false);
    expect(changeSetting).not.toHaveBeenCalled();
  });

  it("drops a color that went away while the alert was open, without asking again", async () => {
    loadThemeOverrides.mockResolvedValueOnce(["foreground", "background"]).mockResolvedValueOnce(["foreground"]);
    confirmAlert.mockResolvedValue(true);
    await applyTheme("Dracula", "dark", vi.fn());
    expect(confirmAlert).toHaveBeenCalledTimes(1);
    expect(changeSetting).toHaveBeenCalledWith(UNSET_FOREGROUND);
  });

  it("writes nothing when the config can't be read, before or after the alert", async () => {
    loadThemeOverrides.mockRejectedValueOnce(new Error("EACCES"));
    expect(await applyTheme("Dracula", "dark", vi.fn())).toBe(false);
    expect(showFailure).toHaveBeenCalledWith("Could not read your Otty config", expect.any(Error));

    loadThemeOverrides.mockResolvedValueOnce(["foreground"]).mockRejectedValueOnce(new Error("EACCES"));
    confirmAlert.mockResolvedValue(true);
    expect(await applyTheme("Dracula", "dark", vi.fn())).toBe(false);
    expect(changeSetting).not.toHaveBeenCalled();
    expect(applySetting).not.toHaveBeenCalled();
  });

  it("stops before setting the theme when the reset fails", async () => {
    loadThemeOverrides.mockResolvedValue(["foreground"]);
    confirmAlert.mockResolvedValue(true);
    changeSetting.mockRejectedValue(new Error("write failed"));
    const onChange = vi.fn();
    expect(await applyTheme("Dracula", "dark", onChange)).toBe(false);
    expect(showFailure).toHaveBeenCalledWith("Could not reset your custom colors", expect.any(Error));
    expect(applySetting).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("refreshes after a reset even when the theme write then fails", async () => {
    loadThemeOverrides.mockResolvedValue(["foreground"]);
    confirmAlert.mockResolvedValue(true);
    applySetting.mockResolvedValue(false);
    const onChange = vi.fn();
    expect(await applyTheme("Dracula", "dark", onChange)).toBe(false);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("says to turn on auto-theme-dark-mode when a dark theme can't show", async () => {
    loadThemeOverrides.mockResolvedValue([]);
    loadAutoDarkMode.mockResolvedValue(false);
    await applyTheme("Dracula", "dark", vi.fn());
    expect(applySetting).toHaveBeenCalledWith(
      SET_DRACULA,
      expect.objectContaining({ message: "Turn on auto-theme-dark-mode for Otty to use it." }),
      "Could not change theme",
      expect.any(Function),
    );
  });
});
