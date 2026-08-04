import { getApplications } from "@raycast/api";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { findThawApplication, isThawInstalled, THAW_INSTALL_URL } from "./checkInstall";

describe("checkInstall", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exposes the Thaw install URL", () => {
    expect(THAW_INSTALL_URL).toContain("stonerl/Thaw");
  });

  it("finds Thaw by name, bundle id, or path", async () => {
    vi.mocked(getApplications).mockResolvedValue([
      { name: "Other", path: "/Applications/Other.app", bundleId: "com.other" },
      {
        name: "Thaw",
        localizedName: "Thaw",
        path: "/Applications/Thaw.app",
        bundleId: "com.stonerl.Thaw",
      },
    ] as Awaited<ReturnType<typeof getApplications>>);

    await expect(findThawApplication()).resolves.toMatchObject({ name: "Thaw" });
    await expect(isThawInstalled()).resolves.toBe(true);
  });

  it("matches debug and dotted thaw bundle ids", async () => {
    vi.mocked(getApplications).mockResolvedValue([
      {
        name: "Helper",
        path: "/Applications/Thaw Debug.app",
        bundleId: "com.stonerl.thaw-debug",
      },
    ] as Awaited<ReturnType<typeof getApplications>>);

    await expect(findThawApplication()).resolves.toMatchObject({
      path: "/Applications/Thaw Debug.app",
    });
  });

  it("returns undefined when Thaw is not installed", async () => {
    vi.mocked(getApplications).mockResolvedValue([
      { name: "Safari", path: "/Applications/Safari.app", bundleId: "com.apple.Safari" },
    ] as Awaited<ReturnType<typeof getApplications>>);

    await expect(findThawApplication()).resolves.toBeUndefined();
    await expect(isThawInstalled()).resolves.toBe(false);
  });
});
