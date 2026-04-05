import { beforeEach, describe, expect, it, vi } from "vitest";

import { useCachedPromise } from "@raycast/utils";
import { listInstalledSkills } from "../utils/skills-cli";
import { useInstalledSkillNames } from "./useInstalledSkillNames";

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return { ...actual, useMemo: (fn: () => unknown) => fn() };
});

vi.mock("@raycast/utils", () => ({
  useCachedPromise: vi.fn(),
}));

vi.mock("../utils/skills-cli", () => ({
  listInstalledSkills: vi.fn(),
}));

describe("useInstalledSkillNames", () => {
  beforeEach(() => {
    vi.mocked(useCachedPromise).mockReset();
    vi.mocked(listInstalledSkills).mockReset();
  });

  it("builds a Set of skill names from cached data", () => {
    vi.mocked(useCachedPromise).mockReturnValue({
      data: ["skill-one", "skill-two"],
      isLoading: false,
    } as ReturnType<typeof useCachedPromise>);

    const { installedNames } = useInstalledSkillNames();

    expect(installedNames).toBeInstanceOf(Set);
    expect(installedNames.has("skill-one")).toBe(true);
    expect(installedNames.has("skill-two")).toBe(true);
    expect(installedNames.has("skill-three")).toBe(false);
  });

  it("returns an empty Set when data is unavailable", () => {
    vi.mocked(useCachedPromise).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as ReturnType<typeof useCachedPromise>);

    const { installedNames } = useInstalledSkillNames();

    expect(installedNames).toBeInstanceOf(Set);
    expect(installedNames.size).toBe(0);
  });

  it("passes through the loading state", () => {
    vi.mocked(useCachedPromise).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useCachedPromise>);

    const { isLoading } = useInstalledSkillNames();

    expect(isLoading).toBe(true);
  });

  it("uses listInstalledSkills as the cached promise factory", async () => {
    vi.mocked(useCachedPromise).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as ReturnType<typeof useCachedPromise>);
    vi.mocked(listInstalledSkills).mockResolvedValue([
      { name: "skill-a", path: "/tmp/skill-a", agents: ["Claude Code"], agentCount: 1 },
      { name: "skill-b", path: "/tmp/skill-b", agents: ["Cursor", "Codex"], agentCount: 2 },
    ]);

    useInstalledSkillNames();

    const [loader] = vi.mocked(useCachedPromise).mock.calls[0];

    await expect(loader()).resolves.toEqual(["skill-a", "skill-b"]);
    expect(listInstalledSkills).toHaveBeenCalled();
  });

  it("matches by skillId only — id and name alone must not match", () => {
    // CLI returns skill names that correspond to the search API's skillId field.
    // The search API Skill type has three distinct fields: id, skillId, and name.
    // Only skillId should match; id and name must not produce false positives.
    vi.mocked(useCachedPromise).mockReturnValue({
      data: ["vercel-example-skill"],
      isLoading: false,
    } as ReturnType<typeof useCachedPromise>);

    const { installedNames } = useInstalledSkillNames();

    // skillId — should match
    expect(installedNames.has("vercel-example-skill")).toBe(true);
    // id (e.g. "owner/repo") — must not match
    expect(installedNames.has("vercel-labs/example")).toBe(false);
    // display name (e.g. "example-skill") — must not match
    expect(installedNames.has("example-skill")).toBe(false);
  });
});
