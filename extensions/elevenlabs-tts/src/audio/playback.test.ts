import { ChildProcess, execFile } from "child_process";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SpeechSessionLock, isOwnedPlaybackCommand, stopActivePlayback } from "./playback";

jest.mock("child_process", () => {
  const { promisify } = jest.requireActual<typeof import("node:util")>("node:util");
  const execFile = jest.fn();
  Object.defineProperty(execFile, promisify.custom, {
    value: (...args: unknown[]) =>
      new Promise((resolve, reject) => {
        execFile(...args, (error: Error | null, stdout: string, stderr: string) => {
          if (error) reject(error);
          else resolve({ stdout, stderr });
        });
      }),
  });
  return { execFile };
});

const mockedExecFile = execFile as jest.MockedFunction<typeof execFile>;
const PLAYBACK_FILE = join(tmpdir(), "elevenlabs-tts-playback.json");

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

  it("denies takeover when stale playback cleanup leaves an active record", async () => {
    const playback = { sessionId: "stale-session", pid: 4242, audioFile: "/tmp/raycast-tts-stale.mp3" };
    await fs.writeFile(PLAYBACK_FILE, JSON.stringify(playback), "utf8");
    cleanupPreviousSession.mockResolvedValue(false);

    await expect(sessionLock.begin()).resolves.toBeUndefined();
    expect(cleanupPreviousSession).toHaveBeenCalledTimes(1);
    await expect(fs.readFile(PLAYBACK_FILE, "utf8")).resolves.toBe(JSON.stringify(playback));
  });
});

describe("stopActivePlayback", () => {
  const sessionId = "stale-session";
  const pid = 4242;
  const audioFile = "/tmp/raycast-tts-stale.mp3";

  beforeEach(async () => {
    mockedExecFile.mockReset();
    await fs.writeFile(PLAYBACK_FILE, JSON.stringify({ sessionId, pid, audioFile }), "utf8");
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await fs.unlink(PLAYBACK_FILE).catch(() => undefined);
  });

  it("preserves playback record when inspection fails and termination is blocked", async () => {
    mockedExecFile.mockImplementation((_file, _args, options, callback) => {
      const cb = typeof options === "function" ? options : callback;
      cb?.(new Error("ps timed out"), "", "");
      return {} as ChildProcess;
    });

    const killError = Object.assign(new Error("Operation not permitted"), { code: "EPERM" });
    jest.spyOn(process, "kill").mockImplementation(() => {
      throw killError;
    });

    await expect(stopActivePlayback()).resolves.toBe(false);
    await expect(fs.readFile(PLAYBACK_FILE, "utf8")).resolves.toBe(JSON.stringify({ sessionId, pid, audioFile }));
  });

  it("clears playback record when inspection fails but the process is already gone", async () => {
    mockedExecFile.mockImplementation((_file, _args, options, callback) => {
      const cb = typeof options === "function" ? options : callback;
      cb?.(new Error("ps timed out"), "", "");
      return {} as ChildProcess;
    });

    jest.spyOn(process, "kill").mockImplementation(() => {
      throw Object.assign(new Error("No such process"), { code: "ESRCH" });
    });

    await expect(stopActivePlayback()).resolves.toBe(false);
    await expect(fs.access(PLAYBACK_FILE)).rejects.toThrow();
  });

  it("preserves playback record without signalling when inspection fails and the process is alive", async () => {
    mockedExecFile.mockImplementation((_file, _args, options, callback) => {
      const cb = typeof options === "function" ? options : callback;
      cb?.(new Error("ps timed out"), "", "");
      return {} as ChildProcess;
    });

    const kill = jest.spyOn(process, "kill").mockImplementation(() => true);

    await expect(stopActivePlayback()).resolves.toBe(false);
    expect(kill).toHaveBeenCalledWith(pid, 0);
    expect(kill).not.toHaveBeenCalledWith(pid, "SIGTERM");
    await expect(fs.readFile(PLAYBACK_FILE, "utf8")).resolves.toBe(JSON.stringify({ sessionId, pid, audioFile }));
  });

  it("terminates the verified player and clears the record once it exits", async () => {
    let terminated = false;
    mockedExecFile.mockImplementation((_file, _args, options, callback) => {
      const cb = typeof options === "function" ? options : callback;
      if (terminated) cb?.(Object.assign(new Error("ps exited with code 1"), { code: 1 }), "", "");
      else cb?.(null, `/usr/bin/afplay ${audioFile}\n`, "");
      return {} as ChildProcess;
    });

    jest.spyOn(process, "kill").mockImplementation((_pid, signal) => {
      if (signal === "SIGTERM") terminated = true;
      return true;
    });

    await expect(stopActivePlayback()).resolves.toBe(true);
    await expect(fs.access(PLAYBACK_FILE)).rejects.toThrow();
  });

  it("keeps the record when the exit check fails and the player is still alive", async () => {
    let terminated = false;
    mockedExecFile.mockImplementation((_file, _args, options, callback) => {
      const cb = typeof options === "function" ? options : callback;
      if (terminated) cb?.(Object.assign(new Error("ps timed out"), { code: "ETIMEDOUT" }), "", "");
      else cb?.(null, `/usr/bin/afplay ${audioFile}\n`, "");
      return {} as ChildProcess;
    });

    jest.spyOn(process, "kill").mockImplementation((_pid, signal) => {
      if (signal === "SIGTERM") terminated = true;
      return true;
    });

    await expect(stopActivePlayback()).resolves.toBe(false);
    await expect(fs.readFile(PLAYBACK_FILE, "utf8")).resolves.toBe(JSON.stringify({ sessionId, pid, audioFile }));
  });

  it("clears the record when the exit check fails but the player is gone", async () => {
    let terminated = false;
    mockedExecFile.mockImplementation((_file, _args, options, callback) => {
      const cb = typeof options === "function" ? options : callback;
      if (terminated) cb?.(Object.assign(new Error("ps timed out"), { code: "ETIMEDOUT" }), "", "");
      else cb?.(null, `/usr/bin/afplay ${audioFile}\n`, "");
      return {} as ChildProcess;
    });

    jest.spyOn(process, "kill").mockImplementation((_pid, signal) => {
      if (signal === "SIGTERM") {
        terminated = true;
        return true;
      }
      if (terminated) throw Object.assign(new Error("No such process"), { code: "ESRCH" });
      return true;
    });

    await expect(stopActivePlayback()).resolves.toBe(true);
    await expect(fs.access(PLAYBACK_FILE)).rejects.toThrow();
  });

  it("treats a defunct player as exited and clears the record", async () => {
    let terminated = false;
    mockedExecFile.mockImplementation((_file, _args, options, callback) => {
      const cb = typeof options === "function" ? options : callback;
      cb?.(null, terminated ? "<defunct>\n" : `/usr/bin/afplay ${audioFile}\n`, "");
      return {} as ChildProcess;
    });

    jest.spyOn(process, "kill").mockImplementation((_pid, signal) => {
      if (signal === "SIGTERM") terminated = true;
      return true;
    });

    await expect(stopActivePlayback()).resolves.toBe(true);
    await expect(fs.access(PLAYBACK_FILE)).rejects.toThrow();
  });

  it("preserves playback record when the verified player survives SIGTERM", async () => {
    mockedExecFile.mockImplementation((_file, _args, options, callback) => {
      const cb = typeof options === "function" ? options : callback;
      cb?.(null, `/usr/bin/afplay ${audioFile}\n`, "");
      return {} as ChildProcess;
    });

    jest.spyOn(process, "kill").mockImplementation(() => true);

    await expect(stopActivePlayback()).resolves.toBe(false);
    await expect(fs.readFile(PLAYBACK_FILE, "utf8")).resolves.toBe(JSON.stringify({ sessionId, pid, audioFile }));
  });
});
