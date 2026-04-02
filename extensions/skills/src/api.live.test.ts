import { describe, expect, it } from "vitest";

import { fetchSkillsSearch } from "./api";

describe("skills.sh live API", () => {
  it("returns a valid response for a concrete search query", async () => {
    const response = await fetchSkillsSearch("vercel", undefined, 10);

    expect(response.query).toBeTypeOf("string");
    expect(response.searchType).toBeTypeOf("string");
    expect(Array.isArray(response.skills)).toBe(true);
    expect(response.count).toBeGreaterThanOrEqual(0);

    for (const skill of response.skills) {
      expect(skill.id).toBeTruthy();
      expect(skill.skillId).toBeTruthy();
      expect(skill.name).toBeTruthy();
      expect(skill.source).toContain("/");
      expect(typeof skill.installs).toBe("number");
    }
  }, 20_000);

  it("returns a valid response for the trending query used by the extension", async () => {
    const response = await fetchSkillsSearch("skill", undefined, 100);

    expect(Array.isArray(response.skills)).toBe(true);
    expect(response.skills.length).toBeGreaterThan(0);

    const ids = new Set(response.skills.map((skill) => skill.id));
    expect(ids.size).toBe(response.skills.length);
  }, 20_000);
});
