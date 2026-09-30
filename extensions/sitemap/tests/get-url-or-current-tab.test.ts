import { beforeEach, describe, expect, it, vi } from "vitest";

const { getTabs, canAccess } = vi.hoisted(() => ({ getTabs: vi.fn(), canAccess: vi.fn() }));

vi.mock("@raycast/api", () => ({
  BrowserExtension: { getTabs },
  environment: { canAccess },
}));

import { getUrlOrCurrentTab } from "../src/get-url-or-current-tab";

beforeEach(() => {
  getTabs.mockReset();
  canAccess.mockReset();
});

describe("getUrlOrCurrentTab", () => {
  it("uses a valid public HTTP(S) argument", async () => {
    await expect(getUrlOrCurrentTab("  https://example.com/path  ")).resolves.toEqual({
      kind: "argument",
      websiteUrl: "https://example.com/path",
    });
  });

  it("rejects unsafe argument schemes", async () => {
    await expect(getUrlOrCurrentTab("file:///etc/passwd")).resolves.toEqual({
      kind: "missing",
      reason: "Enter a valid HTTP(S) URL without credentials.",
    });
  });

  it("explains when the browser extension is unavailable", async () => {
    canAccess.mockReturnValue(false);
    await expect(getUrlOrCurrentTab(undefined)).resolves.toMatchObject({
      kind: "missing",
      reason: expect.stringContaining("Browser Extension"),
    });
  });

  it("uses the active browser tab", async () => {
    canAccess.mockReturnValue(true);
    getTabs.mockResolvedValue([
      { active: false, url: "https://other.example" },
      { active: true, url: "https://example.com" },
    ]);

    await expect(getUrlOrCurrentTab(undefined)).resolves.toEqual({
      kind: "current-tab",
      websiteUrl: "https://example.com/",
    });
  });

  it("handles a missing active browser tab", async () => {
    canAccess.mockReturnValue(true);
    getTabs.mockResolvedValue([{ active: false, url: "https://example.com" }]);

    await expect(getUrlOrCurrentTab(undefined)).resolves.toMatchObject({
      kind: "missing",
      reason: expect.stringContaining("active browser tab URL"),
    });
  });

  it("returns a stable error when browser access fails", async () => {
    canAccess.mockReturnValue(true);
    getTabs.mockRejectedValue(new Error("private implementation detail"));

    await expect(getUrlOrCurrentTab(undefined)).resolves.toEqual({
      kind: "missing",
      reason: "Could not read the active browser tab.",
    });
  });
});
