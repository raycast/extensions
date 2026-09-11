import { describe, expect, it, vi } from "vitest";
import { locateMmdcExecutable, locateNodeExecutable } from "../executables";

describe("locateNodeExecutable", () => {
  it("returns the first existing known node path", async () => {
    const fileExists = vi.fn((target: string) => target === "/opt/homebrew/bin/node");

    const result = await locateNodeExecutable({
      fileExists,
      execCommand: vi.fn(),
      readDir: vi.fn(),
      homeDir: "/Users/test",
    });

    expect(result).toBe("/opt/homebrew/bin/node");
  });
});

describe("locateMmdcExecutable", () => {
  it("prefers the custom path when it exists", async () => {
    const result = await locateMmdcExecutable(
      { customMmdcPath: "~/bin/mmdc" },
      {
        fileExists: vi.fn((target: string) => target === "/Users/test/bin/mmdc"),
        execCommand: vi.fn(),
        readDir: vi.fn(),
        homeDir: "/Users/test",
      },
    );

    expect(result).toBe("/Users/test/bin/mmdc");
  });

  it("uses PATH lookup before scanning known install locations", async () => {
    const execCommand = vi.fn().mockResolvedValue("/usr/local/bin/mmdc\n");

    const result = await locateMmdcExecutable(
      {},
      {
        fileExists: vi.fn(),
        execCommand,
        readDir: vi.fn(),
        homeDir: "/Users/test",
      },
    );

    expect(result).toBe("/usr/local/bin/mmdc");
    expect(execCommand).toHaveBeenCalledWith("which mmdc");
  });

  it("uses known NVM locations when PATH lookup fails", async () => {
    const execCommand = vi.fn().mockRejectedValue(new Error("not found"));
    const readDir = vi.fn((target: string) => (target === "/Users/test/.nvm/versions/node" ? ["v24.14.0"] : []));
    const fileExists = vi.fn((target: string) => target === "/Users/test/.nvm/versions/node/v24.14.0/bin/mmdc");

    const result = await locateMmdcExecutable(
      {},
      {
        fileExists,
        execCommand,
        readDir,
        homeDir: "/Users/test",
      },
    );

    expect(result).toBe("/Users/test/.nvm/versions/node/v24.14.0/bin/mmdc");
  });

  it("throws a structured error when mmdc cannot be found", async () => {
    await expect(
      locateMmdcExecutable(
        {},
        {
          fileExists: vi.fn().mockReturnValue(false),
          execCommand: vi.fn().mockRejectedValue(new Error("not found")),
          readDir: vi.fn().mockReturnValue([]),
          homeDir: "/Users/test",
        },
      ),
    ).rejects.toMatchObject({
      code: "MMDC_NOT_FOUND",
    });
  });
});
