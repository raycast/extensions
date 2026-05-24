import { describe, it, expect, vi, afterEach } from "vitest";
import { EventEmitter } from "node:events";

vi.mock("node:child_process", () => ({ spawn: vi.fn() }));

import { spawn } from "node:child_process";
import { AbortError, DEFAULT_IDLE_MS, runWithWatchdog } from "../src/lib/run";

function fakeChild() {
  const child = new EventEmitter() as EventEmitter & { stdout: EventEmitter; stderr: EventEmitter; kill: () => void };
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  // A real process emits 'close' shortly after kill(); mirror that so the
  // watchdog/abort paths (which now wait for 'close' before settling) resolve.
  child.kill = vi.fn(() => child.emit("close", null));
  return child;
}

const originalPlatform = process.platform;
function setPlatform(platform: NodeJS.Platform) {
  Object.defineProperty(process, "platform", { value: platform, configurable: true });
}

afterEach(() => {
  vi.restoreAllMocks();
  Object.defineProperty(process, "platform", { value: originalPlatform, configurable: true });
});

describe("DEFAULT_IDLE_MS", () => {
  it("is 120 seconds — the same value spotDL used as a hardcoded constant before this helper existed", () => {
    expect(DEFAULT_IDLE_MS).toBe(120_000);
  });
});

describe("runWithWatchdog", () => {
  it("spawns with stdin closed so the child can never hang on an interactive prompt", () => {
    const child = fakeChild();
    (spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(child);

    runWithWatchdog("/bin/x", ["arg"], { idleMs: 1_000 });

    expect(spawn).toHaveBeenCalledWith(
      "/bin/x",
      ["arg"],
      expect.objectContaining({ stdio: ["ignore", "pipe", "pipe"] }),
    );
  });

  it("spawns the child detached on POSIX so it leads its own process group — lets termination reach grandchildren (yt-dlp's ffmpeg) instead of orphaning them", () => {
    // Force darwin so the test exercises the POSIX branch regardless of the
    // host OS the suite runs on (Windows has no POSIX process groups and
    // correctly sets detached:false there).
    setPlatform("darwin");
    const child = fakeChild();
    (spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(child);

    runWithWatchdog("/bin/x", ["arg"], { idleMs: 1_000 });

    expect(spawn).toHaveBeenCalledWith("/bin/x", ["arg"], expect.objectContaining({ detached: true }));
  });

  it("does NOT set detached on Windows — there are no POSIX process groups, so detached would just orphan the child", () => {
    setPlatform("win32");
    const child = fakeChild();
    (spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(child);

    runWithWatchdog("C:/bin/x.exe", ["arg"], { idleMs: 1_000 });

    expect(spawn).toHaveBeenCalledWith("C:/bin/x.exe", ["arg"], expect.objectContaining({ detached: false }));
  });

  it("signals the whole process group (negative pid) on POSIX termination so a grandchild like ffmpeg dies with the child", async () => {
    setPlatform("darwin");
    const killSpy = vi.spyOn(process, "kill").mockImplementation(() => true);
    try {
      const child = fakeChild();
      (child as unknown as { pid: number }).pid = 4242;
      (spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(child);

      const controller = new AbortController();
      const promise = runWithWatchdog("/bin/x", [], { idleMs: 60_000, abortSignal: controller.signal });
      const assertion = expect(promise).rejects.toBeInstanceOf(AbortError);

      child.stdout.emit("data", Buffer.from("running\n"));
      controller.abort();
      // process.kill is stubbed, so the group SIGTERM is a no-op here — emit
      // close ourselves to model the group going down and let the promise settle.
      child.emit("close", null);

      await assertion;
      expect(killSpy).toHaveBeenCalledWith(-4242);
    } finally {
      killSpy.mockRestore();
    }
  });

  it("on Windows, falls back to a direct child.kill() rather than signalling a process group", async () => {
    setPlatform("win32");
    const killSpy = vi.spyOn(process, "kill").mockImplementation(() => true);
    try {
      const child = fakeChild();
      (child as unknown as { pid: number }).pid = 4242;
      (spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(child);

      const controller = new AbortController();
      const promise = runWithWatchdog("C:/bin/x.exe", [], { idleMs: 60_000, abortSignal: controller.signal });
      const assertion = expect(promise).rejects.toBeInstanceOf(AbortError);

      child.stdout.emit("data", Buffer.from("running\n"));
      controller.abort();

      await assertion;
      // process.kill (negative pid) is the POSIX-only path — must not be used on Windows.
      expect(killSpy).not.toHaveBeenCalled();
      expect(child.kill).toHaveBeenCalled();
    } finally {
      killSpy.mockRestore();
    }
  });

  it("resolves with code + accumulated stdout/stderr on close", async () => {
    const child = fakeChild();
    (spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(child);

    const promise = runWithWatchdog("/bin/x", [], { idleMs: 1_000 });
    child.stdout.emit("data", Buffer.from("hello "));
    child.stdout.emit("data", Buffer.from("world\n"));
    child.stderr.emit("data", Buffer.from("warn\n"));
    child.emit("close", 0);

    await expect(promise).resolves.toEqual({ code: 0, stdout: "hello world\n", stderr: "warn\n" });
  });

  it("resolves with a non-zero code rather than rejecting — caller decides what failure means", async () => {
    const child = fakeChild();
    (spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(child);

    const promise = runWithWatchdog("/bin/x", [], { idleMs: 1_000 });
    child.stderr.emit("data", Buffer.from("boom"));
    child.emit("close", 1);

    await expect(promise).resolves.toEqual({ code: 1, stdout: "", stderr: "boom" });
  });

  it("rejects when spawn emits an 'error' event (e.g. ENOENT)", async () => {
    const child = fakeChild();
    (spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(child);

    const promise = runWithWatchdog("/bin/x", [], { idleMs: 1_000 });
    child.emit("error", Object.assign(new Error("spawn ENOENT"), { code: "ENOENT" }));

    await expect(promise).rejects.toThrow(/ENOENT/);
  });

  it("kills the child and rejects when no chunk arrives for idleMs", async () => {
    vi.useFakeTimers();
    try {
      const child = fakeChild();
      (spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(child);

      const promise = runWithWatchdog("/bin/x", [], { idleMs: 5_000 });
      const assertion = expect(promise).rejects.toThrow(/no output for 5s/);

      await vi.advanceTimersByTimeAsync(6_000);

      await assertion;
      expect(child.kill).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("resets the idle timer on every chunk — a steady drip of output is never killed", async () => {
    vi.useFakeTimers();
    try {
      const child = fakeChild();
      (spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(child);

      const promise = runWithWatchdog("/bin/x", [], { idleMs: 5_000 });

      for (let i = 0; i < 4; i++) {
        await vi.advanceTimersByTimeAsync(3_000);
        child.stdout.emit("data", Buffer.from("progress\n"));
      }
      child.emit("close", 0);

      await expect(promise).resolves.toMatchObject({ code: 0 });
      expect(child.kill).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("invokes onStdoutChunk / onStderrChunk so callers can parse incremental progress", async () => {
    const child = fakeChild();
    (spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(child);

    const onStdoutChunk = vi.fn();
    const onStderrChunk = vi.fn();

    const promise = runWithWatchdog("/bin/x", [], { idleMs: 1_000, onStdoutChunk, onStderrChunk });
    child.stdout.emit("data", Buffer.from("a"));
    child.stderr.emit("data", Buffer.from("b"));
    child.emit("close", 0);

    await promise;
    expect(onStdoutChunk).toHaveBeenCalledWith("a");
    expect(onStderrChunk).toHaveBeenCalledWith("b");
  });

  it("uses idleKillMessage in the rejection when provided", async () => {
    vi.useFakeTimers();
    try {
      const child = fakeChild();
      (spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(child);

      const promise = runWithWatchdog("/bin/x", [], {
        idleMs: 1_000,
        idleKillMessage: "custom-stuck-message",
      });
      const assertion = expect(promise).rejects.toThrow(/custom-stuck-message/);

      await vi.advanceTimersByTimeAsync(2_000);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects immediately with AbortError when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      runWithWatchdog("/bin/x", [], { idleMs: 60_000, abortSignal: controller.signal }),
    ).rejects.toBeInstanceOf(AbortError);
    expect(spawn).not.toHaveBeenCalled();
  });

  it("kills the child and rejects with AbortError when the signal aborts mid-flight (user pressed Stop)", async () => {
    const controller = new AbortController();
    const child = fakeChild();
    (spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(child);

    const promise = runWithWatchdog("/bin/x", [], { idleMs: 60_000, abortSignal: controller.signal });
    const assertion = expect(promise).rejects.toBeInstanceOf(AbortError);

    child.stdout.emit("data", Buffer.from("running\n"));
    controller.abort();

    await assertion;
    expect(child.kill).toHaveBeenCalled();
  });

  it("ignores a post-settle abort — the signal listener is removed so a stray abort can't trigger a double settle", async () => {
    const controller = new AbortController();
    const child = fakeChild();
    (spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(child);

    const promise = runWithWatchdog("/bin/x", [], { idleMs: 60_000, abortSignal: controller.signal });
    child.emit("close", 0);
    await promise;

    // Aborting after the child has cleanly closed must not crash or re-settle the promise.
    expect(() => controller.abort()).not.toThrow();
  });

  it("does NOT settle on abort until the child actually closes — so callers have evidence the process exited", async () => {
    const controller = new AbortController();
    const child = fakeChild();
    // Override: kill() does NOT emit close synchronously, modeling a child that
    // takes a moment to exit. The promise must stay pending until close fires.
    child.kill = vi.fn();
    (spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(child);

    const promise = runWithWatchdog("/bin/x", [], { idleMs: 60_000, abortSignal: controller.signal });
    let settled = false;
    void promise.catch(() => {
      settled = true;
    });

    controller.abort();
    await Promise.resolve();
    expect(child.kill).toHaveBeenCalled();
    expect(settled).toBe(false); // still terminating — close hasn't fired yet

    child.emit("close", null);
    await expect(promise).rejects.toBeInstanceOf(AbortError);
  });

  it("escalates to SIGKILL when the child ignores SIGTERM, guaranteeing close eventually fires", async () => {
    vi.useFakeTimers();
    try {
      const killSignals: (string | undefined)[] = [];
      const child = fakeChild();
      child.kill = vi.fn((signal?: string) => {
        killSignals.push(signal);
        if (signal === "SIGKILL") child.emit("close", null); // uncatchable — child finally exits
      }) as unknown as () => void;
      (spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(child);

      const controller = new AbortController();
      const promise = runWithWatchdog("/bin/x", [], { idleMs: 60_000, abortSignal: controller.signal });
      const assertion = expect(promise).rejects.toBeInstanceOf(AbortError);

      controller.abort(); // SIGTERM — child ignores it
      await vi.advanceTimersByTimeAsync(5_000); // past the grace period → SIGKILL

      await assertion;
      expect(killSignals).toEqual([undefined, "SIGKILL"]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("buffers stdout into whole lines via onStdoutLine even when a line is split across chunks", async () => {
    const child = fakeChild();
    (spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(child);

    const lines: string[] = [];
    const promise = runWithWatchdog("/bin/x", [], { idleMs: 1_000, onStdoutLine: (l) => lines.push(l) });

    // "TAG:/path/file.mp4" arrives split across two chunks with no newline between.
    child.stdout.emit("data", Buffer.from("TAG:/path/"));
    child.stdout.emit("data", Buffer.from("file.mp4\nnext line\n"));
    child.emit("close", 0);

    await promise;
    expect(lines).toEqual(["TAG:/path/file.mp4", "next line"]);
  });

  it("flushes a trailing partial line (no final newline) via onStdoutLine on close", async () => {
    const child = fakeChild();
    (spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(child);

    const lines: string[] = [];
    const promise = runWithWatchdog("/bin/x", [], { idleMs: 1_000, onStdoutLine: (l) => lines.push(l) });

    child.stdout.emit("data", Buffer.from("only line, no newline"));
    child.emit("close", 0);

    await promise;
    expect(lines).toEqual(["only line, no newline"]);
  });
});
