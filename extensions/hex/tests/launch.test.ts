import { beforeEach, describe, expect, it, vi } from "vitest";

const { hexMock, openMock } = vi.hoisted(() => ({ hexMock: vi.fn(), openMock: vi.fn() }));

vi.mock("../src/lib/hex", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/hex")>();
  return { ...actual, hex: hexMock };
});

vi.mock("@raycast/api", () => ({
  Cache: class {
    get() {
      return undefined;
    }
    set() {}
  },
  getApplications: async () => [],
  getFrontmostApplication: async () => ({ name: "TextEdit", path: "/System/Applications/TextEdit.app" }),
  open: openMock,
}));

import { HexError } from "../src/lib/hex";
import { openingHex, SETTING_UP } from "../src/lib/launch";

const notRunning = new HexError("not-running", "Hex is not running");
const settingUp = new HexError(SETTING_UP, "Hex is waiting for setup");

beforeEach(() => {
  hexMock.mockReset();
  hexMock.mockResolvedValue({ status: "done" });
  openMock.mockReset();
});

describe("openingHex", () => {
  it("doesn't start Hex when the first attempt works", async () => {
    const attempt = vi.fn().mockResolvedValue("recording");
    await expect(openingHex(attempt)).resolves.toBe("recording");
    expect(hexMock).not.toHaveBeenCalled();
  });

  it("starts Hex and retries while it finishes setting up", async () => {
    const attempt = vi
      .fn()
      .mockRejectedValueOnce(notRunning)
      .mockRejectedValueOnce(settingUp)
      .mockResolvedValue("recording");
    await expect(openingHex(attempt)).resolves.toBe("recording");
    expect(hexMock).toHaveBeenCalledWith(["start"], expect.anything());
    expect(attempt).toHaveBeenCalledTimes(3);
  });

  it("retries while Hex is launched but not answering yet", async () => {
    const attempt = vi
      .fn()
      .mockRejectedValueOnce(notRunning)
      .mockRejectedValueOnce(notRunning)
      .mockResolvedValue("recording");
    await expect(openingHex(attempt)).resolves.toBe("recording");
    expect(hexMock.mock.calls.filter(([args]) => args[0] === "start")).toHaveLength(1);
    expect(attempt).toHaveBeenCalledTimes(3);
  });

  it("hides Hex's window and returns focus to the app in front before it started", async () => {
    const attempt = vi.fn().mockRejectedValueOnce(notRunning).mockResolvedValue("recording");
    await expect(openingHex(attempt)).resolves.toBe("recording");
    expect(hexMock).toHaveBeenCalledWith(["window", "hide"]);
    expect(openMock).toHaveBeenCalledWith("/System/Applications/TextEdit.app");
  });

  it("still dictates when Hex's window can't be hidden", async () => {
    hexMock.mockImplementation(async (args: string[]) => {
      if (args[0] === "window") throw new HexError("failed", "No window");
      return { status: "done" };
    });
    const attempt = vi.fn().mockRejectedValueOnce(notRunning).mockResolvedValue("recording");
    await expect(openingHex(attempt)).resolves.toBe("recording");
  });

  it("rethrows other failures without starting Hex", async () => {
    const refused = new HexError("failed", "Microphone is busy");
    const attempt = vi.fn().mockRejectedValue(refused);
    await expect(openingHex(attempt)).rejects.toBe(refused);
    expect(hexMock).not.toHaveBeenCalled();
  });

  it("gives up when setup doesn't finish in time", async () => {
    vi.useFakeTimers();
    const attempt = vi.fn().mockRejectedValueOnce(notRunning).mockRejectedValue(settingUp);
    const result = openingHex(attempt);
    const settled = expect(result).rejects.toBe(settingUp);
    await vi.advanceTimersByTimeAsync(5_000);
    await settled;
    vi.useRealTimers();
  });

  it("surfaces a failed launch", async () => {
    const timedOut = new HexError("timeout", "Hex didn't respond in time");
    hexMock.mockRejectedValue(timedOut);
    const attempt = vi.fn().mockRejectedValue(notRunning);
    await expect(openingHex(attempt)).rejects.toBe(timedOut);
    expect(attempt).toHaveBeenCalledTimes(1);
  });
});
