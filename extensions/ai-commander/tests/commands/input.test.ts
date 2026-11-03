import { describe, expect, it, vi } from "vitest";
import * as raycast from "@raycast/api";
import { frontmostAppId } from "../../src/commands/input";

vi.mock("@raycast/api", async (importOriginal) => ({
  ...(await importOriginal<typeof raycast>()),
  getFrontmostApplication: vi.fn(),
}));

describe("frontmostAppId", () => {
  it("returns the app", async () => {
    vi.mocked(raycast.getFrontmostApplication).mockResolvedValue({ bundleId: "com.panic.Nova" } as never);
    await expect(frontmostAppId()).resolves.toBe("com.panic.Nova");
  });

  it("treats Raycast as unknown, because its own window says nothing about where the text is", async () => {
    vi.mocked(raycast.getFrontmostApplication).mockResolvedValue({ bundleId: "com.raycast.macos" } as never);
    await expect(frontmostAppId()).resolves.toBeUndefined();
  });

  it("falls back to the path, and survives a failure", async () => {
    vi.mocked(raycast.getFrontmostApplication).mockResolvedValue({ path: "/Applications/Tool.app" } as never);
    await expect(frontmostAppId()).resolves.toBe("/Applications/Tool.app");
    vi.mocked(raycast.getFrontmostApplication).mockRejectedValue(new Error("no app"));
    await expect(frontmostAppId()).resolves.toBeUndefined();
  });
});
