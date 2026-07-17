import { describe, it, expect } from "vitest";
import { matchProfiles } from "../src/matching";
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
