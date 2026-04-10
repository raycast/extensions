import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Skill } from "../shared";
import { buildSkillContentUrls, fetchSkillContent } from "./skill-content";

const sampleSkill: Skill = {
  id: "vercel-labs/example",
  skillId: "vercel-example-skill",
  name: "example-skill",
  installs: 42,
  source: "vercel-labs/agent-skills",
};

describe("buildSkillContentUrls", () => {
  it("builds candidate URLs for SKILL.md and README.md", () => {
    const { skillUrls, readmeUrls } = buildSkillContentUrls(sampleSkill);

    expect(skillUrls).toContain(
      "https://raw.githubusercontent.com/vercel-labs/agent-skills/main/skills/vercel-example-skill/SKILL.md",
    );
    expect(skillUrls).toContain(
      "https://raw.githubusercontent.com/vercel-labs/agent-skills/main/skills/example-skill/SKILL.md",
    );
    expect(readmeUrls).toEqual([
      "https://raw.githubusercontent.com/vercel-labs/agent-skills/main/README.md",
      "https://raw.githubusercontent.com/vercel-labs/agent-skills/master/README.md",
    ]);
  });
});

describe("fetchSkillContent", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns SKILL.md content when available", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/SKILL.md")) {
        return {
          ok: true,
          headers: new Headers({ "content-type": "text/plain" }),
          text: async () => "---\ntitle: Example\n---\n# Skill Body",
        } as Response;
      }
      return {
        ok: false,
        headers: new Headers({ "content-type": "text/plain" }),
        text: async () => "",
      } as Response;
    });

    await expect(fetchSkillContent(sampleSkill)).resolves.toEqual({
      frontmatter: { title: "Example" },
      body: "# Skill Body",
    });
  });

  it("falls back to README.md when all SKILL.md attempts fail", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/README.md")) {
        return {
          ok: true,
          headers: new Headers({ "content-type": "text/plain" }),
          text: async () => "# README Body",
        } as Response;
      }
      return {
        ok: false,
        headers: new Headers({ "content-type": "text/plain" }),
        text: async () => "",
      } as Response;
    });

    await expect(fetchSkillContent(sampleSkill)).resolves.toEqual({
      frontmatter: {},
      body: "# README Body",
    });
  });

  it("returns undefined when every candidate fails", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: false,
      headers: new Headers({ "content-type": "text/plain" }),
      text: async () => "",
    } as Response);

    await expect(fetchSkillContent(sampleSkill)).resolves.toBeUndefined();
  });
});
