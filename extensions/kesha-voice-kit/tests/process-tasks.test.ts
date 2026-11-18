import { describe, expect, it, vi } from "vitest";
import {
  capTail,
  startKeshaRecorder,
  startKeshaTranscriber,
  stopProcessWithWatchdog,
} from "../src/lib/process-tasks";
import { TRANSCRIBE_TIMEOUT_MS } from "../src/lib/dictation-config";
import { FakeProcess, createSpawnRecorder } from "./helpers/fake-process";

const kesha = { command: "kesha", prefixArgs: ["--prefix"] };

describe("process task helpers", () => {
  it("caps captured output to the tail", () => {
    expect(capTail("abcdef", 3)).toBe("def");
    expect(capTail("ab", 3)).toBe("ab");
  });

  it("starts recorder with plain record args and surfaces stderr on failure", async () => {
    const { spawn, calls, processes } = createSpawnRecorder();
    const task = startKeshaRecorder(kesha, "/tmp/audio.wav", 12, { spawn });

    expect(calls[0]).toMatchObject({
      command: "kesha",
      args: [
        "--prefix",
        "record",
        "--out",
        "/tmp/audio.wav",
        "--max-seconds",
        "12",
      ],
      options: { detached: true },
    });

    processes[0].emitStderr("microphone denied");
    processes[0].exit(2);
    await expect(task.done).rejects.toThrow("microphone denied");
  });

  it("stops recorder with stdin newline, SIGTERM watchdog, and SIGKILL watchdog", () => {
    vi.useFakeTimers();
    const proc = new FakeProcess();
    const kill = vi.fn();

    stopProcessWithWatchdog(proc.asChild(), { kill });

    expect(proc.stdin.end).toHaveBeenCalledWith("\n");
    vi.advanceTimersByTime(1500);
    expect(kill).toHaveBeenCalledWith(proc.asChild(), "SIGTERM");
    vi.advanceTimersByTime(3500);
    expect(kill).toHaveBeenCalledWith(proc.asChild(), "SIGKILL");
    vi.useRealTimers();
  });

  it("runs plain transcribe, trims nothing in task, and resolves stdout", async () => {
    const { spawn, calls, processes } = createSpawnRecorder();
    const task = startKeshaTranscriber(kesha, "/tmp/audio.wav", { spawn });

    expect(calls[0]).toMatchObject({
      command: "kesha",
      args: ["--prefix", "/tmp/audio.wav"],
      options: { detached: true },
    });

    processes[0].emitStdout(" hello \n");
    processes[0].exit(0);
    await expect(task.done).resolves.toBe(" hello \n");
  });

  it("kills transcribe on timeout and reports bounded timeout", async () => {
    vi.useFakeTimers();
    const { spawn, processes } = createSpawnRecorder();
    const kill = vi.fn();
    const task = startKeshaTranscriber(kesha, "/tmp/audio.wav", {
      spawn,
      kill,
    });

    vi.advanceTimersByTime(TRANSCRIBE_TIMEOUT_MS);
    expect(kill).toHaveBeenCalledWith(processes[0].asChild(), "SIGTERM");
    processes[0].exit(null);
    await expect(task.done).rejects.toThrow(
      "kesha transcription timed out after 60 seconds.",
    );
    vi.useRealTimers();
  });

  it("can stop an active transcribe task", () => {
    const { spawn, processes } = createSpawnRecorder();
    const kill = vi.fn();
    const task = startKeshaTranscriber(kesha, "/tmp/audio.wav", {
      spawn,
      kill,
    });

    task.stop();

    expect(kill).toHaveBeenCalledWith(processes[0].asChild(), "SIGTERM");
  });

  it("surfaces stderr when transcribe exits nonzero", async () => {
    const { spawn, processes } = createSpawnRecorder();
    const task = startKeshaTranscriber(kesha, "/tmp/audio.wav", { spawn });
    processes[0].emitStderr("bad audio");
    processes[0].exit(1);
    await expect(task.done).rejects.toThrow("bad audio");
  });
});
