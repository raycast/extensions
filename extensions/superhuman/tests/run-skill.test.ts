import { beforeEach, describe, expect, it, vi } from "vitest";
import { __resetLocalStorage } from "./__mocks__/raycast-api";

const READ_ONLY_SKILL = `---
name: morning-briefing
description: Overnight inbox triage.
tools_used:
  - query_email_and_calendar
read_only: true
---

# Morning Briefing

Body.
`;

const WRITES_SKILL = `---
name: meeting-scheduler
description: Schedule a meeting.
tools_used:
  - get_availability
  - create_or_update_event
read_only: false
---

# Meeting Scheduler

Body.
`;

vi.mock("../src/lib/skill-content.generated", () => ({
  SKILL_FILES: {
    "morning-briefing": READ_ONLY_SKILL,
    "meeting-scheduler": WRITES_SKILL,
  },
}));

beforeEach(() => {
  __resetLocalStorage();
  vi.restoreAllMocks();
  // Force bundled fallback: every network call rejects.
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("", { status: 500 })),
  );
});

describe("run-skill", () => {
  it("accepts a slug", async () => {
    const run = (await import("../src/tools/run-skill")).default;
    const out = await run({ skillName: "morning-briefing" });
    expect(out.skill_name).toBe("morning-briefing");
    expect(out.prompt).toContain("Body.");
    expect(out.tools_used).toContain("query_email_and_calendar");
    // The extension prelude is appended after the body.
    expect(out.extension_prelude_applied).toBe(true);
    expect(out.prompt).toMatch(/Operating rules \(extension override\)/);
  });

  it("accepts a fuzzy title", async () => {
    const run = (await import("../src/tools/run-skill")).default;
    const out = await run({ skillName: "Morning Briefing" });
    expect(out.skill_name).toBe("morning-briefing");
  });

  it("accepts a partial title", async () => {
    const run = (await import("../src/tools/run-skill")).default;
    const out = await run({ skillName: "briefing" });
    expect(out.skill_name).toBe("morning-briefing");
  });

  it("read_only_blocked is false for a read-only skill regardless of preference", async () => {
    const run = (await import("../src/tools/run-skill")).default;
    const out = await run({ skillName: "morning-briefing" });
    expect(out.read_only).toBe(true);
    expect(out.read_only_blocked).toBe(false);
  });

  it("read_only_blocked is true for a write skill when read-only mode is on", async () => {
    const mock = await import("./__mocks__/raycast-api");
    mock.__setReadOnly(true);
    try {
      const run = (await import("../src/tools/run-skill")).default;
      const out = await run({ skillName: "meeting-scheduler" });
      expect(out.read_only).toBe(false);
      expect(out.read_only_blocked).toBe(true);
      expect(out.notes).toMatch(/Read-only mode/);
    } finally {
      mock.__setReadOnly(false);
    }
  });

  it("read_only_blocked is false for a write skill when read-only mode is off", async () => {
    const run = (await import("../src/tools/run-skill")).default;
    const out = await run({ skillName: "meeting-scheduler" });
    expect(out.read_only_blocked).toBe(false);
  });

  it("throws a clean error for unknown skills", async () => {
    const run = (await import("../src/tools/run-skill")).default;
    await expect(run({ skillName: "definitely-not-real" })).rejects.toThrow(/Unknown skill/);
  });

  it("throws on empty input", async () => {
    const run = (await import("../src/tools/run-skill")).default;
    await expect(run({ skillName: "" } as { skillName: string })).rejects.toThrow();
  });
});
