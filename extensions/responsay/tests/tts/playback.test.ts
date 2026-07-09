import { describe, it, expect, vi } from "vitest";
import { audioCacheKey, playAudio, loopPlay } from "../../src/tts/playback";

describe("audioCacheKey", () => {
  it("is deterministic and sensitive to rate", () => {
    const a = audioCacheKey({
      text: "hi",
      provider: "openai",
      voice: "alloy",
      rate: 1,
    });
    const b = audioCacheKey({
      text: "hi",
      provider: "openai",
      voice: "alloy",
      rate: 1,
    });
    const c = audioCacheKey({
      text: "hi",
      provider: "openai",
      voice: "alloy",
      rate: 0.5,
    });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});

describe("playAudio", () => {
  it("invokes afplay with the file path", async () => {
    const exec = vi.fn(async () => ({ stdout: "", stderr: "" }));
    await playAudio("/tmp/x.wav", exec as never);
    expect(exec).toHaveBeenCalledWith("afplay", ["/tmp/x.wav"]);
  });
});

describe("loopPlay", () => {
  it("plays the file `times` times", async () => {
    const exec = vi.fn(async () => ({ stdout: "", stderr: "" }));
    await loopPlay("/tmp/x.wav", 3, 0, exec as never);
    expect(exec).toHaveBeenCalledTimes(3);
  });
});
