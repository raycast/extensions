import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/lib/applescript", () => ({ runAppleScript: vi.fn() }));
import { runAppleScript } from "../../src/lib/applescript";
import { getSystemVolume, setSystemVolume } from "../../src/audio/volume";

beforeEach(() => vi.mocked(runAppleScript).mockReset());

describe("volume", () => {
  it("reads volume", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("75");
    expect(await getSystemVolume()).toBe(75);
  });
  it("null on failure", async () => {
    vi.mocked(runAppleScript).mockResolvedValue(null);
    expect(await getSystemVolume()).toBeNull();
  });
  it("sets clamped volume", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("");
    expect(await setSystemVolume(150)).toBe(true);
    expect(runAppleScript).toHaveBeenCalledWith("set volume output volume 100");
  });
  it("rejects NaN without spawning osascript", async () => {
    expect(await setSystemVolume(NaN)).toBe(false);
    expect(runAppleScript).not.toHaveBeenCalled();
  });
  it("clamps negative volume to 0", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("");
    expect(await setSystemVolume(-5)).toBe(true);
    expect(runAppleScript).toHaveBeenCalledWith("set volume output volume 0");
  });
});
