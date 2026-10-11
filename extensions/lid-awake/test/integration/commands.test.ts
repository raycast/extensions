import { beforeEach, describe, expect, it, vi } from "vitest";
import toggle from "../../src/toggle";
import stop from "../../src/stop";
import { installRule } from "../../src/lib/system";
import { useFakeMac } from "./fake-mac";
import { raycast, resetRaycast } from "./fake-raycast";

// The real toggle and stop commands, with the real session.ts, system.ts and parse.ts, against a simulated Mac.

vi.mock("node:child_process", () => ({ execFile: vi.fn() }));
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

describe("toggle command", () => {
  it("turns sleep off for the default duration and shows the HUD for it", async () => {
    await toggle();

    expect(mac.sleepDisabled).toBe(true);
    expect(raycast.showHUD).toHaveBeenCalledTimes(1);
    expect(raycast.showHUD).toHaveBeenCalledWith("Lid Awake on for 1 hour");
    expect(raycast.showFailureToast).not.toHaveBeenCalled();
  });

  it("turns Lid Awake off when it is already on, and shows the off HUD", async () => {
    await toggle();

    await toggle();

    expect(mac.sleepDisabled).toBe(false);
    expect(raycast.showHUD).toHaveBeenLastCalledWith("Lid Awake off");
  });

  it("shows a failure toast and leaves sleep allowed before setup", async () => {
    mac.sudoersFiles.clear();

    await toggle();

    expect(mac.sleepDisabled).toBe(false);
    expect(raycast.showHUD).not.toHaveBeenCalled();
    expect(raycast.showFailureToast).toHaveBeenCalledTimes(1);
    const [error, options] = raycast.showFailureToast.mock.calls[0];
    expect((error as Error).message).toContain("Run Set up Lid Awake first");
    expect(options).toEqual({ title: "Could not toggle Lid Awake" });
  });
});

describe("stop command", () => {
  it("turns Lid Awake off and shows the sleep HUD", async () => {
    await toggle();

    await stop();

    expect(mac.sleepDisabled).toBe(false);
    expect(raycast.showHUD).toHaveBeenLastCalledWith("Lid Awake off, your Mac can sleep normally");
    expect(raycast.showFailureToast).not.toHaveBeenCalled();
  });

  it("shows a failure toast, and keeps sleep disabled, when the rule is gone and the admin prompt is cancelled", async () => {
    await toggle();
    mac.sudoersFiles.clear();
    mac.adminPrompt = "cancel";

    await stop();

    expect(mac.sleepDisabled).toBe(true);
    expect(raycast.showHUD).toHaveBeenCalledTimes(1);
    expect(raycast.showFailureToast).toHaveBeenCalledTimes(1);
    const [error, options] = raycast.showFailureToast.mock.calls[0];
    expect((error as Error).message).toContain("-128");
    expect(options).toEqual({ title: "Could not turn off Lid Awake" });
  });
});
