import { afterAll, describe, expect, test } from "bun:test";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { GroupSignaller } from "../lib/proc";
import { runFabric } from "../lib/runner";
import { alive, pidFrom } from "./procs";

// Stop must end everything fabric started, not only fabric: with a YouTube link fabric runs
// yt-dlp, which outlived a plain SIGTERM to fabric. These fakes start a child (the yt-dlp
// stand-in) and write its pid. Like yt-dlp, a `fake` child doesn't hold our pipes, so fabric's
// exit alone closes them and done must wait on the group itself; LEAVER is the exception.
const tmp = mkdtempSync(join(tmpdir(), "fabric-stop-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

function script(name: string, body: string) {
  const path = join(tmp, name);
  writeFileSync(path, `#!/bin/sh\n${body}`, { flag: "wx" });
  chmodSync(path, 0o755);
  return path;
}
/** fabric waits on a child that has its own stdio. */
const fake = (name: string, child: string) =>
  script(name, `${child} </dev/null >/dev/null 2>&1 &\necho $! > "$PIDFILE"\nwait\n`);
const NICE = fake("nice.sh", "sleep 30");
// Ignored signals survive exec, so this child shrugs off SIGTERM and needs SIGKILL.
const STUBBORN = fake("stubborn.sh", "(trap '' TERM; exec sleep 30)");
// fabric exits at once (no `wait`), leaving the child behind holding our pipes (no redirects).
const LEAVER = script("leaver.sh", 'echo $$ > "$PIDFILE.parent"\nsleep 30 &\necho $! > "$PIDFILE"\n');

async function started(bin: string, pidfile: string, killGraceMs?: number, signalGroup?: GroupSignaller) {
  const h = runFabric(bin, [], { env: { PIDFILE: pidfile }, killGraceMs, signalGroup });
  return { h, pid: await pidFrom(pidfile) };
}

describe("Stop ends fabric's whole process group, and only then reports the run over", () => {
  test("a child that honours SIGTERM is gone when done resolves", async () => {
    const { h, pid } = await started(NICE, join(tmp, "nice.pid"), 3000);
    try {
      const t0 = Date.now();
      h.abort();
      const r = await h.done;
      expect(r.aborted).toBe(true);
      expect(alive(pid) ? `child ${pid} still running after Stop` : "gone").toBe("gone");
      // SIGTERM reached the child itself; the 3 s SIGKILL fallback never had to.
      expect(Date.now() - t0).toBeLessThan(1500);
    } finally {
      if (alive(pid)) process.kill(pid, "SIGKILL");
    }
  }, 5000);

  test("a child that ignores SIGTERM is killed after the grace period, before done resolves", async () => {
    const { h, pid } = await started(STUBBORN, join(tmp, "stubborn.pid"), 300);
    try {
      const t0 = Date.now();
      h.abort();
      const r = await h.done;
      expect(r.aborted).toBe(true);
      expect(alive(pid) ? `child ${pid} still running when done resolved` : "gone").toBe("gone");
      expect(Date.now() - t0).toBeGreaterThanOrEqual(300); // it waited for SIGKILL, not fabric's own exit
    } finally {
      if (alive(pid)) process.kill(pid, "SIGKILL");
    }
  }, 5000);

  // The Raycast views pass no killGraceMs, so the default is what users get: yt-dlp has 2 s to clean up.
  test("with no killGraceMs, a stubborn child gets the default 2 s before SIGKILL", async () => {
    const { h, pid } = await started(STUBBORN, join(tmp, "stubborn-default.pid"));
    try {
      const t0 = Date.now();
      h.abort();
      await h.done;
      const waited = Date.now() - t0;
      expect(waited).toBeGreaterThanOrEqual(1900);
      expect(waited).toBeLessThan(3500);
    } finally {
      if (alive(pid)) process.kill(pid, "SIGKILL");
    }
  }, 6000);

  test("Stop pressed twice sends nothing once the run is over", async () => {
    const { h, pid } = await started(NICE, join(tmp, "nice-twice.pid"), 300);
    try {
      // Only the first press signals, so only it earns a "Stopping…" toast.
      expect(h.abort()).toBe("stopping");
      expect(h.abort()).toBe("over");
      await h.done;
      expect(await killsDuring(500)).toEqual([]); // past the 300 ms grace: a leftover SIGKILL timer would fire
    } finally {
      if (alive(pid)) process.kill(pid, "SIGKILL");
    }
  }, 5000);

  test("Stop still works after fabric exits while its child holds the pipes", async () => {
    const pidfile = join(tmp, "leaver.pid");
    const { h, pid } = await started(LEAVER, pidfile);
    try {
      const parent = await pidFrom(`${pidfile}.parent`);
      for (let i = 0; i < 200 && alive(parent); i++) await Bun.sleep(10);
      expect(alive(parent) ? "fabric never exited" : "only the child is left").toBe("only the child is left");
      h.abort();
      const r = await h.done;
      expect(r.aborted).toBe(true);
      expect(alive(pid) ? `child ${pid} still running after Stop` : "gone").toBe("gone");
    } finally {
      if (alive(pid)) process.kill(pid, "SIGKILL");
    }
  }, 5000);

  // Nothing was signalled, so the run is not "stopped": it failed to start, and says so.
  test("abort on a fabric that never started signals nothing and leaves the failure as it is", async () => {
    const h = runFabric("/nonexistent/fabric", []);
    expect(h.abort()).toBe("over");
    const r = await h.done;
    expect({ aborted: r.aborted, error: !!r.error }).toEqual({ aborted: false, error: true });
  });

  test("abort after the run is over signals nothing (its group id may be reused)", async () => {
    const h = runFabric("/bin/sh", ["-c", "exit 0"], { killGraceMs: 50 });
    await h.done;
    // Well past the 50 ms grace, so a SIGKILL timer would have fired.
    let signalled: string | undefined;
    expect(await killsDuring(250, () => (signalled = h.abort()))).toEqual([]);
    expect(signalled).toBe("over");
  });

  // fabric ended on its own and close hasn't fired: "gone" at the signal is no Stop, so no SIGKILL
  // timer on a group id that may be reused, and the run doesn't read Stopped.
  test("a group already gone when Stop is pressed reads over and stays unaborted", async () => {
    const sent: string[] = [];
    const { h, pid } = await started(NICE, join(tmp, "gone.pid"), 5, (_pgid, sig) => (sent.push(sig), "gone"));
    try {
      expect(h.abort()).toBe("over");
      await Bun.sleep(30); // past the 5 ms grace
      expect(sent).toEqual(["SIGTERM"]);
    } finally {
      if (alive(pid)) process.kill(pid, "SIGKILL");
    }
    expect((await h.done).aborted).toBe(false);
  });

  // An EPERM can't be produced on demand, so the seam answers "denied" for the real, live group.
  test("a group that isn't ours to signal reads denied: not stopping, and the run goes on", async () => {
    const sent: string[] = [];
    const { h, pid } = await started(NICE, join(tmp, "denied.pid"), 5, (_pgid, sig) => (sent.push(sig), "denied"));
    try {
      expect(h.abort()).toBe("denied");
      await Bun.sleep(30); // past the 5 ms grace: a SIGKILL timer would have fired through the seam
      expect(sent).toEqual(["SIGTERM"]);
      expect(alive(pid) ? "still running" : "stopped").toBe("still running");
      // Not marked aborted: a later Stop still tries.
      expect(h.abort()).toBe("denied");
    } finally {
      if (alive(pid)) process.kill(pid, "SIGKILL"); // the child; fabric's `wait` then returns
    }
    expect((await h.done).aborted).toBe(false);
  });
});

/** Every process.kill made while `act` runs and for `ms` after, recorded and not sent. */
async function killsDuring(ms: number, act?: () => void) {
  const real = process.kill;
  const sent: unknown[] = [];
  process.kill = ((pid: number, sig?: string | number) => (sent.push([pid, sig]), true)) as typeof process.kill;
  try {
    act?.();
    await Bun.sleep(ms);
  } finally {
    process.kill = real;
  }
  return sent;
}
