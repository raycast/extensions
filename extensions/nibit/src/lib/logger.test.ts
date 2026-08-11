import { beforeEach, describe, expect, it, vi } from "vitest";

describe("debugLog", () => {
  const originalDebug = process.env.NIBIT_RAYCAST_DEBUG;

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    if (originalDebug === undefined) {
      delete process.env.NIBIT_RAYCAST_DEBUG;
    } else {
      process.env.NIBIT_RAYCAST_DEBUG = originalDebug;
    }
  });

  it("is silent unless explicitly enabled", async () => {
    delete process.env.NIBIT_RAYCAST_DEBUG;
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    const { debugLog } = await import("./logger");
    debugLog("hidden");

    expect(log).not.toHaveBeenCalled();
  });

  it("logs when explicitly enabled", async () => {
    process.env.NIBIT_RAYCAST_DEBUG = "1";
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    const { debugLog } = await import("./logger");
    debugLog("visible");

    expect(log).toHaveBeenCalledWith("visible");
  });
});
