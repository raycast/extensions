import { beforeEach, describe, expect, it, vi } from "vitest";
import { __resetLocalStorage } from "./__mocks__/raycast-api";

/**
 * Regression suite for the bug where `tools_used` came back empty whenever
 * a skill was resolved from the live or cached path. Upstream's
 * `SKILL.md` frontmatter intentionally omits `tools_used`; the resolver
 * must merge that with our bundled metadata.
 */

const BUNDLED_MORNING = `---
name: morning-briefing
description: Bundled description.
tools_used:
  - query_email_and_calendar
  - list_threads
  - get_availability
read_only: true
upstream: https://example.com
---

Bundled body.
`;

const BUNDLED_MEETING = `---
name: meeting-scheduler
description: Bundled description.
tools_used:
  - get_availability
  - create_or_update_event
  - query_email_and_calendar
read_only: false
---

Bundled body.
`;

// Real upstream shape: only name + description.
const UPSTREAM_MORNING = `---
name: morning-briefing
description: Upstream description (different).
---

Upstream body — should win for content.
`;

const UPSTREAM_MEETING = `---
name: meeting-scheduler
description: Upstream description.
---

Upstream body.
`;

vi.mock("../src/lib/skill-content.generated", () => ({
  SKILL_FILES: {
    "morning-briefing": BUNDLED_MORNING,
    "meeting-scheduler": BUNDLED_MEETING,
  },
}));

beforeEach(() => {
  __resetLocalStorage();
  vi.restoreAllMocks();
});

describe("tools_used propagation", () => {
  it("bundled path returns the declared tools_used", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 500 })));
    const { getSkill } = await import("../src/lib/skill-source");
    const out = await getSkill("morning-briefing");
    expect(out.source).toBe("bundled");
    expect(out.skill.frontmatter.tools_used).toEqual([
      "query_email_and_calendar",
      "list_threads",
      "get_availability",
    ]);
    expect(out.skill.frontmatter.read_only).toBe(true);
  });

  it("live path inherits tools_used from bundled when upstream omits it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("/contents/skills"))
          return new Response(
            JSON.stringify([{ name: "morning-briefing", type: "dir", sha: "abc" }]),
            { status: 200 },
          );
        return new Response(UPSTREAM_MORNING, { status: 200 });
      }),
    );
    const { getSkill } = await import("../src/lib/skill-source");
    const out = await getSkill("morning-briefing", { forceRefresh: true });
    expect(out.source).toBe("live");
    // tools_used inherited from bundled
    expect(out.skill.frontmatter.tools_used).toEqual([
      "query_email_and_calendar",
      "list_threads",
      "get_availability",
    ]);
    // read_only inherited from bundled
    expect(out.skill.frontmatter.read_only).toBe(true);
    // body comes from upstream
    expect(out.skill.body).toContain("Upstream body");
    // description from upstream (since upstream declared it)
    expect(out.skill.frontmatter.description).toContain("Upstream description");
  });

  it("cached path round-trips tools_used through LocalStorage", async () => {
    // First call seeds the cache with upstream content.
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("/contents/skills"))
          return new Response(
            JSON.stringify([{ name: "morning-briefing", type: "dir", sha: "abc" }]),
            { status: 200 },
          );
        return new Response(UPSTREAM_MORNING, { status: 200 });
      }),
    );
    const skillSource = await import("../src/lib/skill-source");
    const first = await skillSource.getSkill("morning-briefing");
    expect(first.source).toBe("live");
    expect(first.skill.frontmatter.tools_used.length).toBeGreaterThan(0);

    // Second call (no forceRefresh) reads from cache and still resolves
    // tools_used from bundled.
    const second = await skillSource.getSkill("morning-briefing");
    expect(second.source).toBe("cached");
    expect(second.skill.frontmatter.tools_used).toEqual([
      "query_email_and_calendar",
      "list_threads",
      "get_availability",
    ]);
    expect(second.skill.frontmatter.read_only).toBe(true);
  });

  it("each bundled skill in the catalog reports a non-empty tools_used via the resolver", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 500 })));
    const { listAvailableSkills } = await import("../src/lib/skill-source");
    const out = await listAvailableSkills();
    expect(out.length).toBeGreaterThan(0);
    for (const r of out) {
      expect(r.skill.frontmatter.tools_used.length, `${r.skill.frontmatter.name} should have tools_used`).toBeGreaterThan(0);
    }
  });

  it("upstream `tools` alias is accepted as tools_used", async () => {
    const upstreamWithAlias = `---
name: meeting-scheduler
description: Test.
tools: [some_tool, another_tool]
---

Body.
`;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("/contents/skills"))
          return new Response(
            JSON.stringify([{ name: "meeting-scheduler", type: "dir", sha: "x" }]),
            { status: 200 },
          );
        return new Response(upstreamWithAlias, { status: 200 });
      }),
    );
    const { getSkill } = await import("../src/lib/skill-source");
    const out = await getSkill("meeting-scheduler", { forceRefresh: true });
    expect(out.skill.frontmatter.tools_used).toEqual(["some_tool", "another_tool"]);
  });

  it("upstream tools_used (when declared) overrides bundled", async () => {
    const upstreamWithToolsUsed = `---
name: morning-briefing
description: Test.
tools_used:
  - new_tool_a
  - new_tool_b
---

Body.
`;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("/contents/skills"))
          return new Response(
            JSON.stringify([{ name: "morning-briefing", type: "dir", sha: "x" }]),
            { status: 200 },
          );
        return new Response(upstreamWithToolsUsed, { status: 200 });
      }),
    );
    const { getSkill } = await import("../src/lib/skill-source");
    const out = await getSkill("morning-briefing", { forceRefresh: true });
    expect(out.skill.frontmatter.tools_used).toEqual(["new_tool_a", "new_tool_b"]);
  });
});

describe("the real bundled skills declare tools_used", () => {
  // This test imports the actual generated bundle (not mocked) and asserts
  // every shipped skill has a non-empty tools_used. If a future edit drops
  // it, this catches it before release.
  it("every shipped SKILL.md has non-empty tools_used", async () => {
    vi.unmock("../src/lib/skill-content.generated");
    vi.resetModules();
    const skillsModule = await import("../src/lib/skills");
    const all = skillsModule.listSkills();
    expect(all.length).toBeGreaterThanOrEqual(5);
    for (const s of all) {
      expect(s.frontmatter.tools_used.length, `${s.frontmatter.name} tools_used`).toBeGreaterThan(0);
    }
  });
});
