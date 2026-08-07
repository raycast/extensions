import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SpeechSessionLock, isOwnedPlaybackCommand } from "./playback";

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
  let directory: string;
  let sessionLock: SpeechSessionLock;
  let cleanupPreviousSession: jest.Mock<Promise<boolean>, []>;
  const sessions: string[] = [];

  beforeEach(async () => {
    directory = await fs.mkdtemp(join(tmpdir(), "elevenlabs-tts-test-"));
    cleanupPreviousSession = jest.fn().mockResolvedValue(false);
    sessionLock = new SpeechSessionLock(
      join(directory, "session"),
      { stale: 2_000, update: 1_000 },
      cleanupPreviousSession,
    );
  });

  afterEach(async () => {
    await Promise.all(sessions.splice(0).map((sessionId) => sessionLock.end(sessionId)));
    await fs.rm(directory, { recursive: true, force: true });
  });

  it("allows only one command to synthesize at a time", async () => {
    const firstSession = await sessionLock.begin();
    expect(firstSession).toBeDefined();
    if (!firstSession) throw new Error("Expected to acquire the first speech session");
    sessions.push(firstSession);

    const competingLock = new SpeechSessionLock(join(directory, "session"), { stale: 2_000, update: 1_000 });
    await expect(competingLock.begin()).resolves.toBeUndefined();

    await sessionLock.end(firstSession);
    sessions.pop();

    const nextSession = await sessionLock.begin();
    expect(nextSession).toBeDefined();
    if (!nextSession) throw new Error("Expected to acquire the next speech session");
    sessions.push(nextSession);
  });

  it("recovers an abandoned session and cleans up its playback", async () => {
    const lockDirectory = join(directory, "session.lock");
    await fs.mkdir(lockDirectory);
    const staleTime = new Date(Date.now() - 10_000);
    await fs.utimes(lockDirectory, staleTime, staleTime);

    const session = await sessionLock.begin();

    expect(session).toBeDefined();
    expect(cleanupPreviousSession).toHaveBeenCalledTimes(1);
    if (!session) throw new Error("Expected to recover the abandoned session");
    sessions.push(session);
  });
});
