import { beforeEach, describe, expect, it, vi } from "vitest";
import { __resetLocalStorage } from "./__mocks__/raycast-api";

const A = `---
name: alpha
description: Alpha skill.
tools_used:
  - list_threads
read_only: true
---

Body A.
`;

const B = `---
name: beta
description: Beta skill.
tools_used:
  - create_or_update_draft
read_only: false
---

Body B.
`;

vi.mock("../src/lib/skill-content.generated", () => ({
  SKILL_FILES: { alpha: A, beta: B },
}));

beforeEach(() => {
  __resetLocalStorage();
  vi.restoreAllMocks();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("", { status: 500 })),
  );
});

describe("list-skills", () => {
  it("returns every bundled skill with correct metadata", async () => {
    const list = (await import("../src/tools/list-skills")).default;
    const { skills } = await list({});
    expect(skills).toHaveLength(2);
    const names = skills.map((s) => s.name).sort();
    expect(names).toEqual(["alpha", "beta"]);
    const alpha = skills.find((s) => s.name === "alpha");
    expect(alpha?.read_only).toBe(true);
    expect(alpha?.tools_used).toContain("list_threads");
    expect(alpha?.source).toBe("bundled");
    const beta = skills.find((s) => s.name === "beta");
    expect(beta?.read_only).toBe(false);
    expect(beta?.tools_used).toContain("create_or_update_draft");
  });

  it("respects forceRefresh by retrying the network", async () => {
    const fetchSpy = vi.fn(async () => new Response("", { status: 500 }));
    vi.stubGlobal("fetch", fetchSpy);
    const list = (await import("../src/tools/list-skills")).default;
    await list({ forceRefresh: true });
    // Listing endpoint at minimum is hit; bundled fallback then serves bodies.
    expect(fetchSpy).toHaveBeenCalled();
  });
});
