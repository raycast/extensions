import { describe, it, expect } from "vitest";
import { matchProfiles, profileKeywords, listenerKeywords } from "../src/matching";
import type { Profile } from "../src/profiles";
import type { ListeningPort } from "../src/system";

function listener(overrides: Partial<ListeningPort>): ListeningPort {
  return { command: "node", pid: "100", port: "3000", address: "127.0.0.1", kind: "project", ...overrides };
}

function profile(overrides: Partial<Profile>): Profile {
  return { id: "p1", cwd: "/proj", run: "npm run dev", ...overrides };
}

describe("matchProfiles", () => {
  it("matches a profile to the listener in its folder", () => {
    const hit = listener({ cwd: "/proj" });
    const { matches, orphans } = matchProfiles([profile({})], [hit]);
    expect(matches.get("p1")).toEqual({ status: "running", listener: hit });
    expect(orphans).toEqual([]);
  });

  it("never matches across folders, even when the port agrees", () => {
    const hit = listener({ cwd: "/other", port: "3000" });
    const { matches, orphans } = matchProfiles([profile({ port: 3000 })], [hit]);
    expect(matches.get("p1")?.status).toBe("stopped");
    expect(orphans).toEqual([hit]);
  });

  it("matches exactly on the cwd, never by prefix", () => {
    const hit = listener({ cwd: "/proj/site" });
    const { matches } = matchProfiles([profile({ cwd: "/proj" })], [hit]);
    expect(matches.get("p1")?.status).toBe("stopped");
  });

  it("gives a declared-port profile first pick over a portless sibling", () => {
    const dev = listener({ pid: "1", port: "5173", cwd: "/proj" });
    const storybook = listener({ pid: "2", port: "6006", cwd: "/proj" });
    const declared = profile({ id: "sb", port: 6006 });
    const portless = profile({ id: "dev" });

    // The portless profile comes FIRST in the list: without the two-pass
    // ordering it would grab 6006 before the profile that declared it.
    const { matches } = matchProfiles([portless, declared], [storybook, dev]);
    expect(matches.get("sb")?.listener).toBe(storybook);
    expect(matches.get("dev")?.listener).toBe(dev);
  });

  it("falls back to a cwd-only match when the dev server moved ports", () => {
    const moved = listener({ port: "5174", cwd: "/proj" });
    const { matches } = matchProfiles([profile({ port: 5173 })], [moved]);
    expect(matches.get("p1")).toEqual({ status: "running", listener: moved });
  });

  it("reports who holds the declared port of a stopped profile", () => {
    const squatter = listener({ cwd: "/elsewhere", port: "5173" });
    const { matches } = matchProfiles([profile({ port: 5173 })], [squatter]);
    expect(matches.get("p1")).toEqual({ status: "stopped", portTakenBy: squatter });
  });

  it("reports a stopped profile plainly when its port is free", () => {
    const { matches } = matchProfiles([profile({ port: 5173 })], []);
    expect(matches.get("p1")).toEqual({ status: "stopped", portTakenBy: undefined });
  });

  it("leaves unclaimed listeners as orphans", () => {
    const claimed = listener({ pid: "1", cwd: "/proj" });
    const stray = listener({ pid: "2", port: "8080", cwd: "/stray" });
    const { orphans } = matchProfiles([profile({})], [claimed, stray]);
    expect(orphans).toEqual([stray]);
  });

  it("never hands one listener to two profiles", () => {
    const only = listener({ cwd: "/proj" });
    const { matches } = matchProfiles([profile({ id: "a" }), profile({ id: "b" })], [only]);
    const statuses = [matches.get("a")?.status, matches.get("b")?.status].sort();
    expect(statuses).toEqual(["running", "stopped"]);
  });
});

/* ─── What the search field can find ─── */

describe("profileKeywords", () => {
  const p = profile({ cwd: "/Users/me/Projects/cv-machine/site", port: 5173, run: "npm run dev" });

  // The regression: Raycast indexes title, subtitle and keywords only. A stopped
  // profile's subtitle is undefined and its declared port lives in the detail
  // pane, so searching the port you declared found nothing.
  it("finds a stopped profile by the port it declares", () => {
    expect(profileKeywords(p, { status: "stopped" })).toContain("5173");
  });

  it("finds a profile by its folder name, not just its full path", () => {
    expect(profileKeywords(p, { status: "stopped" })).toContain("site");
  });

  it("finds a running profile by the port it actually got", () => {
    const moved = listener({ port: "5174", cwd: p.cwd });
    expect(profileKeywords(p, { status: "running", listener: moved })).toContain("5174");
  });

  it("finds it by the runner, and does not drag the whole command line in", () => {
    const keys = profileKeywords(p, { status: "stopped" });
    expect(keys).toContain("npm");
    expect(keys).not.toContain("run");
    expect(keys).not.toContain("dev");
  });

  it("says nothing about a port that was never declared", () => {
    const portless = profile({ cwd: "/proj", port: undefined });
    expect(profileKeywords(portless, { status: "stopped" })).toEqual(["proj", "npm"]);
  });

  it("keeps no blanks and no repeats — a keyword list is not a place to say nothing", () => {
    const same = profile({ cwd: "/5173", port: 5173, run: "" });
    const keys = profileKeywords(same, { status: "stopped" });

    expect(keys).toEqual(["5173"]);
  });
});

describe("listenerKeywords", () => {
  it("finds an untracked port by its port, command and folder name", () => {
    const p = listener({ port: "8000", command: "Python", cwd: "/Users/me/Projects/folio" });
    expect(listenerKeywords(p)).toEqual(["8000", "Python", "folio"]);
  });

  it("offers no folder when the process would not tell us one", () => {
    const rootOwned = listener({ port: "7000", command: "ControlCenter", cwd: undefined });
    expect(listenerKeywords(rootOwned)).toEqual(["7000", "ControlCenter"]);
  });
});
