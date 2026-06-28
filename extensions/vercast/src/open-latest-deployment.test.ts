import { getPreferenceValues, LocalStorage, open, showToast } from "@raycast/api";
import { beforeEach, describe, expect, test, vi } from "vitest";
import Command from "./open-latest-deployment";
import isValidToken from "./utils/is-valid-token";
import { fetchLatestDeployment, fetchTeams, fetchUser } from "./vercel";

vi.mock("@raycast/api", () => ({
  getPreferenceValues: vi.fn(),
  LocalStorage: {
    getItem: vi.fn(),
    removeItem: vi.fn(),
  },
  open: vi.fn(),
  openCommandPreferences: vi.fn(),
  showToast: vi.fn(),
  Toast: {
    Style: {
      Animated: "animated",
      Failure: "failure",
      Success: "success",
    },
  },
}));

vi.mock("./utils/is-valid-token", () => ({
  default: vi.fn(),
}));

vi.mock("./vercel", () => ({
  fetchLatestDeployment: vi.fn(),
  fetchTeams: vi.fn(),
  fetchUser: vi.fn(),
  getDeploymentURL: vi.fn(),
}));

describe("open latest deployment command", () => {
  beforeEach(() => {
    vi.mocked(showToast).mockResolvedValue({} as never);
    vi.mocked(isValidToken).mockResolvedValue(true);
    vi.mocked(LocalStorage.getItem).mockResolvedValue("team_saved");
    vi.mocked(getPreferenceValues).mockReturnValue({ openTarget: "deployUrl" });
    vi.mocked(fetchUser).mockResolvedValue({ username: "user" } as never);
    vi.mocked(fetchLatestDeployment).mockResolvedValue({
      name: "web",
      uid: "dpl_123",
      url: "web.vercel.app",
    } as never);
  });

  test("uses stored selected team id when fetching teams fails", async () => {
    vi.mocked(fetchTeams).mockRejectedValue(new Error("teams unavailable"));

    await Command();

    expect(fetchLatestDeployment).toHaveBeenCalledWith("team_saved", undefined);
    expect(open).toHaveBeenCalledWith("https://web.vercel.app");
    expect(LocalStorage.removeItem).not.toHaveBeenCalled();
  });
});
