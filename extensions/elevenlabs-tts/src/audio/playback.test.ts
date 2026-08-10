import { beginSpeechSession, endSpeechSession, isOwnedPlaybackCommand } from "./playback";

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

describe("speech sessions", () => {
  const sessions: string[] = [];

  afterEach(async () => {
    await Promise.all(sessions.splice(0).map(endSpeechSession));
  });

  it("allows only one command to synthesize at a time", async () => {
    const firstSession = await beginSpeechSession();
    expect(firstSession).toBeDefined();
    if (!firstSession) throw new Error("Expected to acquire the first speech session");
    sessions.push(firstSession);

    await expect(beginSpeechSession()).resolves.toBeUndefined();

    await endSpeechSession(firstSession);
    sessions.pop();

    const nextSession = await beginSpeechSession();
    expect(nextSession).toBeDefined();
    if (!nextSession) throw new Error("Expected to acquire the next speech session");
    sessions.push(nextSession);
  });
});
