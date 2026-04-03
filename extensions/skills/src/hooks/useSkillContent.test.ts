import { beforeEach, describe, expect, it, vi } from "vitest";

import { useCachedPromise } from "@raycast/utils";
import type { Skill } from "../shared";
import { fetchSkillContent } from "./skill-content";
import { useSkillContent } from "./useSkillContent";

vi.mock("@raycast/utils", () => ({
  useCachedPromise: vi.fn(),
}));

vi.mock("./skill-content", () => ({
  fetchSkillContent: vi.fn(),
}));

const sampleSkill: Skill = {
  id: "vercel-labs/example",
  skillId: "vercel-example-skill",
  name: "example-skill",
  installs: 42,
  source: "vercel-labs/agent-skills",
};

describe("useSkillContent", () => {
  beforeEach(() => {
    vi.mocked(useCachedPromise).mockReset();
    vi.mocked(fetchSkillContent).mockReset();
  });

  it("returns content and frontmatter from cached data", () => {
    vi.mocked(useCachedPromise).mockReturnValue({
      data: {
        body: "# Skill Body",
        frontmatter: { title: "Example", description: "Sample skill" },
      },
      isLoading: false,
    } as ReturnType<typeof useCachedPromise>);

    const result = useSkillContent(sampleSkill);

    expect(result).toEqual({
      content: "# Skill Body",
      frontmatter: { title: "Example", description: "Sample skill" },
      isLoading: false,
    });
  });

  it("falls back to an empty frontmatter object when data is unavailable", () => {
    vi.mocked(useCachedPromise).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as ReturnType<typeof useCachedPromise>);

    const result = useSkillContent(sampleSkill);

    expect(result).toEqual({
      content: undefined,
      frontmatter: {},
      isLoading: false,
    });
  });

  it("passes through the loading state", () => {
    vi.mocked(useCachedPromise).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useCachedPromise>);

    const result = useSkillContent(sampleSkill);

    expect(result.isLoading).toBe(true);
  });

  it("forwards the execute option to useCachedPromise", () => {
    vi.mocked(useCachedPromise).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as ReturnType<typeof useCachedPromise>);

    useSkillContent(sampleSkill, false);

    expect(useCachedPromise).toHaveBeenCalledWith(expect.any(Function), [sampleSkill], {
      keepPreviousData: true,
      execute: false,
    });
  });

  it("uses fetchSkillContent as the cached promise factory", async () => {
    vi.mocked(useCachedPromise).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as ReturnType<typeof useCachedPromise>);
    vi.mocked(fetchSkillContent).mockResolvedValue({
      body: "# Skill Body",
      frontmatter: {},
    });

    useSkillContent(sampleSkill);

    const [loader] = vi.mocked(useCachedPromise).mock.calls[0];

    await expect(loader(sampleSkill)).resolves.toEqual({
      body: "# Skill Body",
      frontmatter: {},
    });
    expect(fetchSkillContent).toHaveBeenCalledWith(sampleSkill);
  });
});
