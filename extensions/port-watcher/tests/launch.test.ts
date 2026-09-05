import { describe, it, expect, afterEach } from "vitest";
import { spawn, type ChildProcess } from "child_process";
import { mkdtempSync, writeFileSync } from "fs";
import { join } from "path";
import { pickNewListener, lastRunTail, listenerKey, watchLaunch, type LaunchHandle } from "../src/launch";
import { canonicalCwd } from "../src/profiles";
import type { Profile } from "../src/profiles";
import { readListeningPorts, type ListeningPort } from "../src/system";

function listener(overrides: Partial<ListeningPort>): ListeningPort {
  return { command: "node", pid: "100", port: "3000", address: "127.0.0.1", kind: "project", ...overrides };
}

const profile: Profile = { id: "p1", cwd: "/proj", run: "npm run dev" };

describe("pickNewListener", () => {
  it("ignores a listener that predates the launch — the sibling-server trap", () => {
    const sibling = listener({ pid: "1", port: "5173", cwd: "/proj" });
    expect(pickNewListener([sibling], profile, new Set([listenerKey(sibling)]))).toBeUndefined();
  });

  it("returns a listener that appeared after the snapshot", () => {
    const fresh = listener({ pid: "2", port: "6006", cwd: "/proj" });
    expect(pickNewListener([fresh], profile, new Set())).toBe(fresh);
  });

  it("tells the new listener from the preexisting one in the same folder", () => {
    const sibling = listener({ pid: "1", port: "5173", cwd: "/proj" });
    const fresh = listener({ pid: "2", port: "6006", cwd: "/proj" });
    expect(pickNewListener([sibling, fresh], profile, new Set([listenerKey(sibling)]))).toBe(fresh);
  });

  it("prefers the declared port when several new listeners appear", () => {
    const other = listener({ pid: "2", port: "5173", cwd: "/proj" });
    const declared = listener({ pid: "3", port: "6006", cwd: "/proj" });
    expect(pickNewListener([other, declared], { ...profile, port: 6006 }, new Set())).toBe(declared);
  });

  it("still accepts a new listener on another port — dev servers move when their port is taken", () => {
    const moved = listener({ pid: "2", port: "5174", cwd: "/proj" });
    expect(pickNewListener([moved], { ...profile, port: 5173 }, new Set())).toBe(moved);
  });

  it("never credits the launch with a listener from another folder", () => {
    const elsewhere = listener({ pid: "2", cwd: "/other" });
    expect(pickNewListener([elsewhere], profile, new Set())).toBeUndefined();
  });

  // This test used to hand a pid the snapshot could never hold, so it passed for
  // any implementation — including one that ignored the snapshot outright, which
  // is exactly what a mutation run proved. Both directions now, against one
  // snapshot: that is what makes it discriminate.
  it("keys the snapshot on the pid, not the port — a restart reuses the port", () => {
    const server = listener({ pid: "1", port: "5173", cwd: "/proj" });
    const restarted = listener({ pid: "9", port: "5173", cwd: "/proj" });
    const snapshot = new Set([listenerKey(server)]);

    // Same pid: this is the very listener we saw before the spawn.
    expect(pickNewListener([server], profile, snapshot)).toBeUndefined();
    // Same port, new pid: a restart. Keying on the port alone would call it old
    // and let the launch hang waiting for a port that is already there.
    expect(pickNewListener([restarted], profile, snapshot)).toBe(restarted);
  });

  // listenerKey is what watchLaunch builds its snapshot with, while
  // pickNewListener inlines the same format. Nothing else pins that they agree.
  it("agrees with the key format pickNewListener filters on", () => {
    expect(listenerKey(listener({ pid: "42", port: "8080" }))).toBe("42:8080");
  });
});

describe("lastRunTail", () => {
  const log = [
    "===== run 2026-07-16T10:00:00.000Z — npm run dev",
    "old output line",
    "Port 5173 is in use, trying another one…",
    "",
    "===== run 2026-07-16T11:00:00.000Z — npm run dev",
    "fresh output",
  ].join("\n");

  it("returns only the last run's output", () => {
    expect(lastRunTail(log)).toBe("fresh output");
  });

  it("returns an empty string for a run that produced no output", () => {
    const silent = log + "\n===== run 2026-07-16T12:00:00.000Z — npm run dev\n";
    expect(lastRunTail(silent)).toBe("");
  });

  it("keeps only the requested number of lines", () => {
    const noisy = "===== run 2026-07-16T10:00:00.000Z — x\n" + ["a", "b", "c", "d"].join("\n");
    expect(lastRunTail(noisy, 2)).toBe("c\nd");
  });

  it("handles a file with no separator at all", () => {
    expect(lastRunTail("just output\nlast line")).toBe("just output\nlast line");
  });

  it("returns an empty string for an empty file", () => {
    expect(lastRunTail("")).toBe("");
  });
});

/* ─── watchLaunch: the three outcomes, decided by observation ─── */

// launchProfile is deliberately NOT used here: it writes to LOGS_DIR, a fixed
// path under the real ~/.config, and a test suite has no business writing there.
// watchLaunch takes its handle as an argument, so a fabricated one drives every
// outcome — and the listening case still runs a real server, because that is the
// half only the OS can answer.
describe("watchLaunch", () => {
  const alive: ChildProcess[] = [];

  afterEach(async () => {
    for (const c of alive.splice(0)) {
      try {
        process.kill(-c.pid!, "SIGKILL");
      } catch {
        /* already gone */
      }
    }
  });

  function staticSite(): Promise<string> {
    const dir = mkdtempSync(join("/private/tmp", "pw-watch-"));
    writeFileSync(join(dir, "index.html"), "<h1>hi</h1>");
    return canonicalCwd(dir);
  }

  function serve(dir: string): void {
    const child = spawn(process.env.SHELL || "/bin/zsh", ["-l", "-c", "python3 -m http.server 0 --bind 127.0.0.1"], {
      cwd: dir,
      detached: true,
      stdio: "ignore",
    });
    child.unref();
    alive.push(child);
  }

  // A healthy server never exits, so its handle never settles. That is not a
  // stub standing in for something — it is the real shape of a working launch.
  const running: LaunchHandle = { pid: 1, exited: new Promise(() => {}) };
  const exitedWith = (code: number | null, error?: string): LaunchHandle => ({
    pid: 1,
    exited: Promise.resolve({ code, ...(error !== undefined ? { error } : {}) }),
  });

  it("reports the port a launch actually opened", async () => {
    const cwd = await staticSite();
    const profile: Profile = { id: "w1", cwd, run: "python3 -m http.server 0 --bind 127.0.0.1" };
    const before = await readListeningPorts();
    serve(cwd);

    const outcome = await watchLaunch(profile, running, before);

    expect(outcome.kind).toBe("listening");
    if (outcome.kind !== "listening") return;
    expect(outcome.listener.cwd).toBe(cwd);
    expect(Number(outcome.listener.port)).toBeGreaterThan(0);
    expect(outcome.listener.address).toBe("127.0.0.1");
  });

  // The review's regression, and the reason the snapshot argument exists: a
  // sibling already serving this folder must not answer for the new launch.
  it("never credits a launch with a listener that predates it", async () => {
    const cwd = await staticSite();
    serve(cwd);
    // Let the sibling come up, then snapshot it as pre-existing.
    let before: ListeningPort[] = [];
    for (let i = 0; i < 30; i++) {
      before = await readListeningPorts();
      if (before.some((p) => p.cwd === cwd)) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    expect(before.some((p) => p.cwd === cwd)).toBe(true); // the fixture must be sound

    const profile: Profile = { id: "w2", cwd, run: "python3 -m http.server 0 --bind 127.0.0.1" };
    const outcome = await watchLaunch(profile, exitedWith(1), before);

    // The sibling is listening in this very folder, and it still loses: the
    // command we launched died, and that is what we report.
    expect(outcome.kind).toBe("exited");
  });

  it("reports an exit with its code once no new port appeared", async () => {
    const profile: Profile = { id: "w3", cwd: await staticSite(), run: "false" };
    const outcome = await watchLaunch(profile, exitedWith(1), await readListeningPorts());

    expect(outcome).toMatchObject({ kind: "exited", code: 1 });
  });

  it("carries a spawn error through instead of an exit code it never had", async () => {
    const profile: Profile = { id: "w4", cwd: await staticSite(), run: "whatever" };
    const outcome = await watchLaunch(profile, exitedWith(null, "spawn /bin/zsh ENOENT"), await readListeningPorts());

    expect(outcome).toMatchObject({ kind: "exited", code: null, error: "spawn /bin/zsh ENOENT" });
  });

  // Alive, and nothing listening: an install or a long build. The honest answer
  // is that we stopped watching — not that anything failed. Reaching it needs
  // the deadline to run out, which is why stopAfterMs can be shrunk; at its real
  // 90 seconds this outcome is the one nothing could ever pin.
  it("says it stopped watching rather than call a living process dead", async () => {
    const profile: Profile = { id: "w5", cwd: await staticSite(), run: "sleep 60" };
    // Nothing ever serves this folder, and the handle never settles: the two
    // early exits are both unreachable, so only the deadline can end the watch.
    const outcome = await watchLaunch(profile, running, await readListeningPorts(), { stopAfterMs: 300 });

    expect(outcome).toEqual({ kind: "still-working" });
  });

  it("keeps watching until the deadline rather than answering early", async () => {
    const profile: Profile = { id: "w6", cwd: await staticSite(), run: "sleep 60" };
    const started = Date.now();
    await watchLaunch(profile, running, await readListeningPorts(), { stopAfterMs: 1200 });

    // Not a stopwatch: just proof the deadline is what ends it, and that it does
    // not give up on the first poll and call it "still working".
    expect(Date.now() - started).toBeGreaterThanOrEqual(1000);
  });
});
