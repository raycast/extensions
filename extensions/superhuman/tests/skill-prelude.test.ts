import { beforeEach, describe, expect, it, vi } from "vitest";
import { __resetLocalStorage } from "./__mocks__/raycast-api";

const BUNDLED_READ = `---
name: read-skill
description: A read-only skill.
tools_used:
  - list_threads
read_only: true
---

Body of the read-only skill.
`;

const BUNDLED_WRITE = `---
name: write-skill
description: A write skill.
tools_used:
  - create_or_update_draft
read_only: false
---

Body of the write skill.
`;

const BUNDLED_OPT_OUT = `---
name: opt-out-skill
description: Skips the extension prelude on purpose.
tools_used:
  - list_threads
read_only: true
skip_extension_prelude: true
---

Body of the opt-out skill.
`;

vi.mock("../src/lib/skill-content.generated", () => ({
  SKILL_FILES: {
    "read-skill": BUNDLED_READ,
    "write-skill": BUNDLED_WRITE,
    "opt-out-skill": BUNDLED_OPT_OUT,
  },
}));

beforeEach(() => {
  __resetLocalStorage();
  vi.restoreAllMocks();
  // Bundled fallback only — no network.
  vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 500 })));
});

describe("SKILL_PRELUDE constant", () => {
  it("contains the literal substrings that downstream prompts depend on", async () => {
    const { SKILL_PRELUDE } = await import("../src/lib/skill-prelude");
    expect(SKILL_PRELUDE).toContain("Operating rules (extension override)");
    expect(SKILL_PRELUDE).toContain("list-threads");
    expect(SKILL_PRELUDE).toContain("query-email-and-calendar");
    expect(SKILL_PRELUDE).toContain("16-character lowercase hex");
    expect(SKILL_PRELUDE).toContain("url");
    expect(SKILL_PRELUDE).toContain("mail.superhuman.com");
  });
});

describe("run-skill prelude injection", () => {
  it("appends the prelude after the body for a standard skill", async () => {
    const run = (await import("../src/tools/run-skill")).default;
    const out = await run({ skillName: "read-skill" });
    expect(out.extension_prelude_applied).toBe(true);
    expect(out.prompt.indexOf("Body of the read-only skill.")).toBeLessThan(
      out.prompt.indexOf("Operating rules (extension override)"),
    );
    expect(out.prompt).toMatch(/Body of the read-only skill\.[\s\S]*---[\s\S]*Operating rules/);
  });

  it("appends the prelude on every bundled skill", async () => {
    const run = (await import("../src/tools/run-skill")).default;
    for (const name of ["read-skill", "write-skill"]) {
      const out = await run({ skillName: name });
      expect(out.extension_prelude_applied, `${name} prelude_applied`).toBe(true);
      expect(out.prompt, `${name} prompt`).toContain("Operating rules (extension override)");
      expect(out.prompt, `${name} prompt`).toContain("list-threads");
      expect(out.prompt, `${name} prompt`).toContain("16-character lowercase hex");
    }
  });

  it("respects skip_extension_prelude: true and returns body without the prelude", async () => {
    const run = (await import("../src/tools/run-skill")).default;
    const out = await run({ skillName: "opt-out-skill" });
    expect(out.extension_prelude_applied).toBe(false);
    expect(out.prompt).not.toContain("Operating rules (extension override)");
    expect(out.prompt).toBe("Body of the opt-out skill.");
  });
});
