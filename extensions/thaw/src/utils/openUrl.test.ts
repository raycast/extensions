import { open, showHUD } from "@raycast/api";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { findThawApplication, THAW_INSTALL_URL } from "./checkInstall";
import { showError } from "./error";
import { buildThawUrl, openThawUrl } from "./openUrl";

vi.mock("./checkInstall", async () => {
  const actual = await vi.importActual<typeof import("./checkInstall")>("./checkInstall");
  return {
    ...actual,
    findThawApplication: vi.fn(),
  };
});

vi.mock("./error", () => ({
  showError: vi.fn(),
}));

describe("buildThawUrl", () => {
  it("builds a path-only thaw URL without a trailing slash", () => {
    expect(buildThawUrl("toggle-hidden")).toBe("thaw://toggle-hidden");
    expect(buildThawUrl("toggle-hidden")).not.toContain("toggle-hidden/");
  });

  it("appends query params and skips empty values", () => {
    expect(buildThawUrl("toggle", { key: "autoRehide", display: undefined })).toBe("thaw://toggle?key=autoRehide");
  });

  it("encodes multiple query params", () => {
    expect(
      buildThawUrl("toggle", {
        key: "showOnHover",
        label: "Show on hover & delay",
        display: undefined,
      }),
    ).toBe("thaw://toggle?key=showOnHover&label=Show+on+hover+%26+delay");
  });
});

describe("openThawUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows install HUD and returns false when Thaw is missing", async () => {
    vi.mocked(findThawApplication).mockResolvedValue(undefined);

    await expect(openThawUrl("search", "Opened Search Panel")).resolves.toBe(false);

    expect(showHUD).toHaveBeenCalledWith(`Thaw is not installed. Get it at: ${THAW_INSTALL_URL}`);
    expect(open).not.toHaveBeenCalled();
  });

  it("opens the thaw URL and shows the success HUD", async () => {
    vi.mocked(findThawApplication).mockResolvedValue({
      name: "Thaw",
      path: "/Applications/Thaw.app",
    } as Awaited<ReturnType<typeof findThawApplication>>);

    await expect(openThawUrl("toggle", "Sent toggle", { key: "showOnHover" })).resolves.toBe(true);

    expect(open).toHaveBeenCalledWith("thaw://toggle?key=showOnHover");
    expect(showHUD).toHaveBeenCalledWith("Sent toggle");
  });

  it("reports errors and returns false", async () => {
    vi.mocked(findThawApplication).mockResolvedValue({
      name: "Thaw",
      path: "/Applications/Thaw.app",
    } as Awaited<ReturnType<typeof findThawApplication>>);
    vi.mocked(open).mockRejectedValueOnce(new Error("boom"));

    await expect(openThawUrl("search", "Opened Search Panel")).resolves.toBe(false);

    expect(showError).toHaveBeenCalledWith(expect.any(Error));
  });
});
