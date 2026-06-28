import { LocalStorage } from "@raycast/api";
import { describe, expect, test, vi } from "vitest";
import useVercel from "./use-vercel-info";
import useSharedState from "./use-shared-state";
import { fetchTeams, fetchUser } from "../vercel";

vi.mock("react", () => ({
  useEffect: (effect: () => void) => effect(),
}));

vi.mock("@raycast/api", () => ({
  LocalStorage: {
    getItem: vi.fn(),
  },
}));

vi.mock("./use-shared-state", () => ({
  default: vi.fn(),
}));

vi.mock("../vercel", () => ({
  fetchTeams: vi.fn(),
  fetchUser: vi.fn(),
}));

describe("useVercel", () => {
  test("preserves stored selected team id when fetching teams fails", async () => {
    const setUser = vi.fn();
    const setTeams = vi.fn();
    const setSelectedTeamId = vi.fn();

    vi.mocked(useSharedState)
      .mockReturnValueOnce([undefined, setUser])
      .mockReturnValueOnce([undefined, setTeams])
      .mockReturnValueOnce([undefined, setSelectedTeamId]);
    vi.mocked(LocalStorage.getItem).mockResolvedValue("team_saved");
    vi.mocked(fetchUser).mockResolvedValue(undefined as never);
    vi.mocked(fetchTeams).mockRejectedValue(new Error("teams unavailable"));

    useVercel();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(setSelectedTeamId).toHaveBeenCalledWith("team_saved");
    expect(setSelectedTeamId).not.toHaveBeenCalledWith(undefined);
    expect(setTeams).not.toHaveBeenCalledWith([]);
  });
});
