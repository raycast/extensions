import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";

import { buildSkillsSearchUrl, fetchSkillsSearch } from "./api";

describe("buildSkillsSearchUrl", () => {
  it("builds the skills search URL with encoded query and limit", () => {
    expect(buildSkillsSearchUrl("hello world", 25)).toBe("https://skills.sh/api/search?q=hello%20world&limit=25");
  });
});

describe("fetchSkillsSearch", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("deduplicates duplicate skills returned by the API", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        query: "skill",
        searchType: "semantic",
        count: 2,
        skills: [
          { id: "dup", skillId: "dup", name: "Duplicate", installs: 1, source: "owner/repo" },
          { id: "dup", skillId: "dup", name: "Duplicate", installs: 1, source: "owner/repo" },
        ],
      }),
    } as Response);

    const result = await fetchSkillsSearch("skill");
    expect(result.skills).toHaveLength(1);
    expect(result.skills[0].id).toBe("dup");
  });

  it("throws on non-ok responses", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
    } as Response);

    await expect(fetchSkillsSearch("skill")).rejects.toThrow("HTTP 503");
  });
});
