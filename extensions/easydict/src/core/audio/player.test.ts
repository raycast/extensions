import { runPowerShellScript } from "@raycast/utils";
import fs from "fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { playWordAudio } from "./player";
import { playTTS } from "./tts";

vi.mock("@raycast/utils", () => ({
  runPowerShellScript: vi.fn(),
}));

vi.mock("fs", () => ({
  default: {
    existsSync: vi.fn(),
  },
}));

vi.mock("tinyexec", () => ({
  x: vi.fn(),
}));

vi.mock("@/utils/logger", () => ({
  logError: vi.fn(),
  logTrace: vi.fn(),
  logWarn: vi.fn(),
}));

vi.mock("./tts", () => ({
  playTTS: vi.fn(),
}));

const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform");

beforeEach(() => {
  vi.mocked(fs.existsSync).mockReset().mockReturnValue(true);
  vi.mocked(runPowerShellScript).mockReset().mockResolvedValue("");
  vi.mocked(playTTS).mockReset();
  Object.defineProperty(process, "platform", { value: "win32" });
});

afterEach(() => {
  if (originalPlatform) {
    Object.defineProperty(process, "platform", originalPlatform);
  }
});

describe("playWordAudio", () => {
  it("passes Windows paths to PowerShell without interpolating special characters", async () => {
    const audioPath = "C:\\Users\\price$tag\\tick`name\\speech.wav";

    await playWordAudio("test", "en", { audioPath });

    expect(runPowerShellScript).toHaveBeenCalledOnce();
    const script = vi.mocked(runPowerShellScript).mock.calls[0][0];
    const encodedCommand = script.match(/FromBase64String\("([^"]+)"\)/)?.[1];
    expect(encodedCommand).toBeDefined();
    expect(Buffer.from(encodedCommand ?? "", "base64").toString("utf8")).toBe(`play "${audioPath}" wait`);
    expect(script).not.toContain(audioPath);
    expect(playTTS).not.toHaveBeenCalled();
  });
});
