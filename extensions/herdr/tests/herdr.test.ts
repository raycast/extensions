import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveHerdrBinary } from "../src/lib/herdr";

vi.mock("node:fs/promises", () => ({ access: vi.fn() }));
vi.mock("../src/lib/preferences", () => ({
  getHerdrPreferences: () => ({ herdrPath: "~/.local/bin/herdr" }),
}));

describe("resolveHerdrBinary", () => {
  beforeEach(() => {
    vi.mocked(access).mockReset().mockResolvedValue();
  });

  it("expands a leading tilde in the configured binary path", async () => {
    const expected = join(homedir(), ".local", "bin", "herdr");

    await expect(resolveHerdrBinary()).resolves.toBe(expected);
    expect(access).toHaveBeenCalledWith(expected, constants.X_OK);
  });
});
