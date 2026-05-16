import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetLocalStorage } from "./__mocks__/raycast-api";

const FIXTURE_RAW = `---
name: fixture-skill
description: Fixture used in unit tests.
tools_used:
  - query_email_and_calendar
read_only: true
upstream: https://example.com/fixture/SKILL.md
upstream_sha: ""
---

# Fixture Skill

Hello world.
`;

const BUNDLED_RAW = `---
name: morning-briefing
description: Overnight inbox triage plus today's calendar summary.
tools_used:
  - query_email_and_calendar
read_only: true
---

# Morning Briefing

Bundled body.
`;

vi.mock("../src/lib/skill-content.generated", () => ({
  SKILL_FILES: {
    "morning-briefing": BUNDLED_RAW,
    "fixture-skill": FIXTURE_RAW,
  },
}));

beforeEach(() => {
  __resetLocalStorage();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockFetch(handler: (url: string) => Response | Promise<Response>) {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => handler(String(url))));
}

describe("skill-source", () => {
  it("returns bundled content when the network fails", async () => {
    mockFetch(() => new Response("", { status: 500 }));
    const { getSkill } = await import("../src/lib/skill-source");
    const out = await getSkill("morning-briefing");
    expect(out.source).toBe("bundled");
    expect(out.skill.frontmatter.name).toBe("morning-briefing");
    expect(out.skill.body).toContain("Bundled body.");
  });

  it("caches a successful live fetch and serves cached on next call", async () => {
    const live = FIXTURE_RAW.replace("Hello world.", "Hello world (live).");
    mockFetch((url) => {
      if (url.includes("/contents/skills"))
        return new Response(
          JSON.stringify([{ name: "fixture-skill", type: "dir", sha: "abc123" }]),
          { status: 200 },
        );
      if (url.endsWith("/SKILL.md")) return new Response(live, { status: 200 });
      return new Response("", { status: 404 });
    });
    const { getSkill } = await import("../src/lib/skill-source");
    const first = await getSkill("fixture-skill");
    expect(first.source).toBe("live");
    expect(first.skill.body).toContain("Hello world (live).");
    const second = await getSkill("fixture-skill");
    expect(second.source).toBe("cached");
    expect(second.skill.body).toContain("Hello world (live).");
  });

  it("forceRefresh bypasses the cache", async () => {
    const original = FIXTURE_RAW.replace("Hello world.", "Hello v1.");
    const updated = FIXTURE_RAW.replace("Hello world.", "Hello v2.");
    let calls = 0;
    mockFetch((url) => {
      if (url.includes("/contents/skills"))
        return new Response(
          JSON.stringify([{ name: "fixture-skill", type: "dir", sha: "abc" }]),
          { status: 200 },
        );
      calls++;
      return new Response(calls === 1 ? original : updated, { status: 200 });
    });
    const { getSkill } = await import("../src/lib/skill-source");
    const first = await getSkill("fixture-skill");
    expect(first.skill.body).toContain("Hello v1.");
    const second = await getSkill("fixture-skill", { forceRefresh: true });
    expect(second.skill.body).toContain("Hello v2.");
    expect(second.source).toBe("live");
  });

  it("falls back to bundled when both network and cache are unavailable", async () => {
    mockFetch(() => {
      throw new Error("network down");
    });
    const { getSkill } = await import("../src/lib/skill-source");
    const out = await getSkill("morning-briefing");
    expect(out.source).toBe("bundled");
  });

  it("resolveSlug matches slug, title, and partial input", async () => {
    const { resolveSlug } = await import("../src/lib/skill-source");
    const known = ["morning-briefing", "eod-wrapup", "meeting-scheduler"];
    expect(resolveSlug("morning-briefing", known)).toBe("morning-briefing");
    expect(resolveSlug("Morning Briefing", known)).toBe("morning-briefing");
    expect(resolveSlug("morning briefing", known)).toBe("morning-briefing");
    expect(resolveSlug("MORNING_BRIEFING", known)).toBe("morning-briefing");
    expect(resolveSlug("briefing", known)).toBe("morning-briefing");
    expect(resolveSlug("nope", known)).toBeNull();
  });

  it("listAvailableSkills uses bundled catalog when upstream listing fails", async () => {
    mockFetch(() => new Response("", { status: 500 }));
    const { listAvailableSkills } = await import("../src/lib/skill-source");
    const out = await listAvailableSkills();
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((r) => r.source === "bundled")).toBe(true);
  });
});
