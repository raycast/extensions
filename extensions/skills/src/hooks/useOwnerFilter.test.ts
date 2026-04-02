import { describe, expect, it } from "vitest";

import type { Skill } from "../shared";
import { buildOwnerCounts, filterSkillsByOwner, resolveOwnerSelection } from "./useOwnerFilter";

const skills: Skill[] = [
  { id: "1", skillId: "a", name: "A", installs: 10, source: "vercel/example-a" },
  { id: "2", skillId: "b", name: "B", installs: 20, source: "anthropic/example-b" },
  { id: "3", skillId: "c", name: "C", installs: 30, source: "vercel/example-c" },
];

describe("buildOwnerCounts", () => {
  it("counts owners and sorts them alphabetically", () => {
    expect([...buildOwnerCounts(skills).entries()]).toEqual([
      ["anthropic", 1],
      ["vercel", 2],
    ]);
  });
});

describe("filterSkillsByOwner", () => {
  it("returns all skills for the all filter", () => {
    expect(filterSkillsByOwner(skills, "all")).toEqual(skills);
  });

  it("returns only skills from the selected owner", () => {
    expect(filterSkillsByOwner(skills, "vercel")).toEqual([skills[0], skills[2]]);
  });
});

describe("resolveOwnerSelection", () => {
  it("keeps the current owner when it still exists", () => {
    expect(resolveOwnerSelection("vercel", buildOwnerCounts(skills))).toBe("vercel");
  });

  it("resets to all when the selected owner disappears", () => {
    expect(resolveOwnerSelection("vercel", buildOwnerCounts([skills[1]]))).toBe("all");
  });

  it("returns all when owner is all and counts are empty", () => {
    expect(resolveOwnerSelection("all", new Map())).toBe("all");
  });

  it("resets to all when owner is missing and counts are empty", () => {
    expect(resolveOwnerSelection("vercel", new Map())).toBe("all");
  });
});
