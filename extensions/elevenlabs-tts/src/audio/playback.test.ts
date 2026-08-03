import { isOwnedPlaybackCommand } from "./playback";

describe("isOwnedPlaybackCommand", () => {
  const audioFile = "/tmp/raycast-tts-123.mp3";

  it("recognizes the tracked afplay process", () => {
    expect(isOwnedPlaybackCommand(`/usr/bin/afplay -r 1.00 ${audioFile}`, audioFile)).toBe(true);
  });

  it("rejects afplay for a different audio file", () => {
    expect(isOwnedPlaybackCommand("/usr/bin/afplay /tmp/other.mp3", audioFile)).toBe(false);
    expect(isOwnedPlaybackCommand(`/usr/bin/afplay ${audioFile}.backup`, audioFile)).toBe(false);
  });

  it("rejects a different process with the tracked path", () => {
    expect(isOwnedPlaybackCommand(`/usr/bin/cat ${audioFile}`, audioFile)).toBe(false);
  });
});
