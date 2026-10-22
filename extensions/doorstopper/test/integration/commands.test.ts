import { beforeEach, describe, expect, it, vi } from "vitest";
import toggle from "../../src/toggle";
import enableCommand from "../../src/enable";
import stop from "../../src/disable";
import status from "../../src/status";
import { installRule } from "../../src/lib/system";
import { useFakeMac } from "./fake-mac";
import { raycast, resetRaycast } from "./fake-raycast";

// The real Toggle, Enable, Disable and Status commands, with the real session.ts, system.ts and parse.ts, against a simulated Mac.

vi.mock("node:child_process", () => ({ execFile: vi.fn(), exec: vi.fn() }));
vi.mock("node:fs", () => ({ existsSync: vi.fn(), readFileSync: vi.fn() }));
vi.mock("node:os", () => {
  const mocked = { userInfo: vi.fn() };
  return { ...mocked, default: mocked };
});
vi.mock("@raycast/api", async () => (await import("./fake-raycast")).raycastApi);
vi.mock("@raycast/utils", async () => (await import("./fake-raycast")).raycastUtils);

const mac = useFakeMac();

beforeEach(async () => {
  resetRaycast();
  await installRule();
  mac.clearLog();
});

function sessionKeys(): string[] {
  return [...raycast.store.keys()].filter((key) => key.startsWith("session:"));
}

describe("toggle command", () => {
  it("enables Doorstopper until disabled by default, with no prompt once the rule is installed", async () => {
    await toggle();

    expect(mac.sleepDisabled).toBe(true);
    expect(raycast.showHUD).toHaveBeenCalledTimes(1);
    expect(raycast.showHUD).toHaveBeenCalledWith("Doorstopper is now enabled");
    expect(raycast.showFailureToast).not.toHaveBeenCalled();
    expect(mac.log.some((call) => call.file === "runAppleScript")).toBe(false);
  });

  it("enables Doorstopper for the default duration when one is set", async () => {
    raycast.prefs.defaultDuration = "60";

    await toggle();

    expect(mac.sleepDisabled).toBe(true);
    expect(raycast.showHUD).toHaveBeenCalledWith("Doorstopper is now enabled for 1 hour");
  });

  it("disables Doorstopper when it is already enabled, and shows the disabled HUD", async () => {
    await toggle();

    await toggle();

    expect(mac.sleepDisabled).toBe(false);
    expect(raycast.showHUD).toHaveBeenLastCalledWith("Doorstopper is now disabled");
  });

  it("enables through the password prompt before setup, as Doorstopper always has", async () => {
    mac.sudoersFiles.clear();

    await toggle();

    expect(mac.sleepDisabled).toBe(true);
    expect(mac.log.filter((call) => call.file === "runAppleScript")).toHaveLength(1);
    expect(raycast.showHUD).toHaveBeenCalledWith("Doorstopper is now enabled");
    expect(sessionKeys()).toEqual([]);
  });

  it("shows the authentication canceled notice and leaves sleep allowed when the prompt is cancelled before setup", async () => {
    mac.sudoersFiles.clear();
    mac.adminPrompt = "cancel";

    await toggle();

    expect(mac.sleepDisabled).toBe(false);
    expect(raycast.showHUD).not.toHaveBeenCalled();
    expect(raycast.showFailureToast).not.toHaveBeenCalled();
    expect(raycast.showToast).toHaveBeenCalledWith({
      style: "failure",
      title: "Authentication canceled",
      message: "Doorstopper was not changed",
    });
  });

  it("shows a failure toast and leaves sleep allowed when a timed default is set before setup", async () => {
    mac.sudoersFiles.clear();
    raycast.prefs.defaultDuration = "60";

    await toggle();

    expect(mac.sleepDisabled).toBe(false);
    expect(raycast.showHUD).not.toHaveBeenCalled();
    expect(raycast.showFailureToast).toHaveBeenCalledTimes(1);
    const [error, options] = raycast.showFailureToast.mock.calls[0];
    expect((error as Error).message).toContain("Run Set up Passwordless Doorstopper first");
    expect(options).toEqual({ title: "Failed to toggle Doorstopper" });
  });

  it("shows the authentication canceled notice when Touch ID is cancelled before setup", async () => {
    mac.sudoersFiles.clear();
    mac.touchIdForSudo = true;
    mac.touchIdPrompt = "cancel";

    await toggle();

    expect(mac.sleepDisabled).toBe(false);
    expect(raycast.showToast).toHaveBeenCalledWith({
      style: "failure",
      title: "Authentication canceled",
      message: "Doorstopper was not changed",
    });
    expect(raycast.showFailureToast).not.toHaveBeenCalled();
  });
});

describe("enable command", () => {
  it("enables Doorstopper and stores an indefinite session the menu bar can end after a restart", async () => {
    await enableCommand();

    expect(mac.sleepDisabled).toBe(true);
    expect(raycast.showHUD).toHaveBeenCalledWith("Doorstopper is now enabled");
    expect(sessionKeys()).toHaveLength(1);
    expect(JSON.parse(raycast.store.get(sessionKeys()[0]) ?? "{}")).toMatchObject({ endsAt: null });
  });

  it("ignores the default duration, since Enable always means until disabled", async () => {
    raycast.prefs.defaultDuration = "30";

    await enableCommand();

    expect(raycast.showHUD).toHaveBeenCalledWith("Doorstopper is now enabled");
    expect(JSON.parse(raycast.store.get(sessionKeys()[0]) ?? "{}")).toMatchObject({ endsAt: null });
  });

  it("refuses below the battery cutoff once the rule is installed, and leaves sleep allowed", async () => {
    mac.battery = { present: true, percent: 10, onAC: false };

    await enableCommand();

    expect(mac.sleepDisabled).toBe(false);
    expect(raycast.showFailureToast).toHaveBeenCalledTimes(1);
    expect((raycast.showFailureToast.mock.calls[0][0] as Error).message).toBe(
      "Battery is at 10%, at or below your 20% cutoff",
    );
  });
});

describe("disable command", () => {
  it("disables Doorstopper and shows the disabled HUD", async () => {
    await toggle();

    await stop();

    expect(mac.sleepDisabled).toBe(false);
    expect(raycast.showHUD).toHaveBeenLastCalledWith("Doorstopper is now disabled");
    expect(raycast.showFailureToast).not.toHaveBeenCalled();
  });

  it("shows the authentication canceled notice, and keeps sleep disabled, when the rule is gone and the prompt is cancelled", async () => {
    await toggle();
    mac.sudoersFiles.clear();
    mac.adminPrompt = "cancel";

    await stop();

    expect(mac.sleepDisabled).toBe(true);
    expect(raycast.showHUD).toHaveBeenCalledTimes(1);
    expect(raycast.showFailureToast).not.toHaveBeenCalled();
    expect(raycast.showToast).toHaveBeenCalledWith({
      style: "failure",
      title: "Authentication canceled",
      message: "Doorstopper was not changed",
    });
  });

  it("shows the success HUD and no failure toast when the power settings cannot be read during the final check", async () => {
    await toggle();
    // Turn Off reads the power settings once, after the sessions are cleared. That read fails.
    mac.failPmsetReads = 1;

    await stop();

    expect(mac.sleepDisabled).toBe(false);
    expect(raycast.showHUD).toHaveBeenLastCalledWith("Doorstopper is now disabled");
    expect(raycast.showFailureToast).not.toHaveBeenCalled();
    expect([...raycast.store.keys()].filter((key) => key.startsWith("session:"))).toEqual([]);
  });

  it("shows the success HUD and no failure toast when storage cannot be read during the final check", async () => {
    await toggle();
    let fired = false;
    raycast.afterRemoveItem = (key) => {
      if (!fired && key.startsWith("session:")) {
        fired = true;
        // A Start in another command disables sleep after the sessions are cleared. The read that then checks for a
        // session fails, so the sessions are unknown.
        mac.sleepDisabled = true;
        raycast.storageFaults = { skip: 0, fail: 1 };
      }
    };

    await stop();

    expect(fired).toBe(true);
    expect(raycast.showHUD).toHaveBeenLastCalledWith("Doorstopper is now disabled");
    expect(raycast.showFailureToast).not.toHaveBeenCalled();
    // An unknown session state keeps sleep disabled rather than allowing it, as the session module does.
    expect(mac.sleepDisabled).toBe(true);
  });
});

describe("status command", () => {
  it("shows disabled before anything is enabled", async () => {
    await status();

    expect(raycast.updateCommandMetadata).toHaveBeenCalledWith({ subtitle: "✖ Disabled" });
  });

  it("shows enabled after Enable", async () => {
    await enableCommand();

    await status();

    expect(raycast.updateCommandMetadata).toHaveBeenLastCalledWith({ subtitle: "✔ Enabled" });
  });

  it("shows the time left after a timed Toggle", async () => {
    raycast.prefs.defaultDuration = "120";
    await toggle();

    await status();

    expect(raycast.updateCommandMetadata).toHaveBeenLastCalledWith({
      subtitle: expect.stringMatching(/^✔ Enabled, (2h 00m|1h 59m) left$/),
    });
  });

  it("shows enabled when sleep was disabled outside Doorstopper", async () => {
    mac.sleepDisabled = true;

    await status();

    expect(raycast.updateCommandMetadata).toHaveBeenCalledWith({ subtitle: "✔ Enabled" });
  });
});
