import { describe, it, expect } from "vitest";
import { pickNewListener, lastRunTail, listenerKey } from "../src/launch";
import type { Profile } from "../src/profiles";
import type { ListeningPort } from "../src/system";

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

  it("treats the same port under a NEW pid as new — a restart is a new process", () => {
    const restarted = listener({ pid: "9", port: "5173", cwd: "/proj" });
    expect(pickNewListener([restarted], profile, new Set(["1:5173"]))).toBe(restarted);
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
