import { describe, expect, it, vi, beforeEach } from "vitest";
import { existsSync } from "fs";
import { execFileSync } from "child_process";

vi.mock("child_process", () => ({
  execFileSync: vi.fn(),
}));

vi.mock("fs", () => ({
  existsSync: vi.fn(),
}));

const mockedExecFileSync = vi.mocked(execFileSync);
const mockedExistsSync = vi.mocked(existsSync);

// Import after mocking
import {
  getOpenTabs,
  getRecentDocuments,
  isInstalled,
  isRunning,
  PdfFile,
} from "../../src/lib/pdf-expert";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("isInstalled", () => {
  it("returns true when app exists", () => {
    mockedExistsSync.mockReturnValue(true);
    expect(isInstalled()).toBe(true);
    expect(mockedExistsSync).toHaveBeenCalledWith(
      "/Applications/PDF Expert.app",
    );
  });

  it("returns false when app does not exist", () => {
    mockedExistsSync.mockReturnValue(false);
    expect(isInstalled()).toBe(false);
  });
});

describe("isRunning", () => {
  it("returns true when pgrep finds process", () => {
    mockedExecFileSync.mockReturnValue("12345\n" as never);
    expect(isRunning()).toBe(true);
    expect(mockedExecFileSync).toHaveBeenCalledWith(
      "pgrep",
      ["-x", "PDF Expert"],
      expect.any(Object),
    );
  });

  it("returns false when pgrep finds nothing", () => {
    mockedExecFileSync.mockImplementation(() => {
      throw new Error("exit code 1");
    });
    expect(isRunning()).toBe(false);
  });
});

describe("getOpenTabs", () => {
  it("returns empty array when app is not running", () => {
    mockedExecFileSync.mockImplementation(() => {
      throw new Error("exit code 1");
    });
    expect(getOpenTabs()).toEqual([]);
  });

  it("parses lsof output and deduplicates", () => {
    mockedExecFileSync
      .mockReturnValueOnce("86974\n" as never) // pgrep
      .mockReturnValueOnce(
        [
          "p86974",
          "n/dev/null",
          "n/tmp/notes.pdf",
          "n/tmp/notes.pdf", // duplicate
          "n/tmp/slides.PDF", // uppercase extension
          "n/tmp/not-a-pdf.txt",
          "",
        ].join("\n") as never,
      ); // lsof

    mockedExistsSync.mockReturnValue(true);

    const result = getOpenTabs();
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("notes");
    expect(result[0].fullName).toBe("notes.pdf");
    expect(result[0].path).toBe("/tmp/notes.pdf");
    expect(result[1].name).toBe("slides");
    expect(result[1].fullName).toBe("slides.PDF");
    expect(result[1].path).toBe("/tmp/slides.PDF");
  });

  it("sorts results alphabetically by name", () => {
    mockedExecFileSync
      .mockReturnValueOnce("100\n" as never)
      .mockReturnValueOnce(
        [
          "p100",
          "n/tmp/zebra.pdf",
          "n/tmp/alpha.pdf",
          "n/tmp/middle.pdf",
          "",
        ].join("\n") as never,
      );

    mockedExistsSync.mockReturnValue(true);

    const result = getOpenTabs();
    expect(result.map((f: PdfFile) => f.name)).toEqual([
      "alpha",
      "middle",
      "zebra",
    ]);
  });

  it("handles paths with spaces", () => {
    mockedExecFileSync
      .mockReturnValueOnce("100\n" as never)
      .mockReturnValueOnce(
        ["p100", "n/Users/test/My Documents/My File (2026).pdf", ""].join(
          "\n",
        ) as never,
      );

    mockedExistsSync.mockReturnValue(true);

    const result = getOpenTabs();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("My File (2026)");
    expect(result[0].fullName).toBe("My File (2026).pdf");
    expect(result[0].path).toBe("/Users/test/My Documents/My File (2026).pdf");
    expect(result[0].folder).toBe("/Users/test/My Documents");
  });

  it("marks non-existent files", () => {
    mockedExecFileSync
      .mockReturnValueOnce("100\n" as never)
      .mockReturnValueOnce(["p100", "n/tmp/gone.pdf", ""].join("\n") as never);

    mockedExistsSync.mockReturnValue(false);

    const result = getOpenTabs();
    expect(result[0].exists).toBe(false);
  });

  it("takes first PID when multiple returned", () => {
    mockedExecFileSync
      .mockReturnValueOnce("100\n200\n" as never)
      .mockReturnValueOnce(["p100", "n/tmp/a.pdf", ""].join("\n") as never);

    mockedExistsSync.mockReturnValue(true);

    const result = getOpenTabs();
    expect(result).toHaveLength(1);
    // Verify lsof was called with first PID only
    expect(mockedExecFileSync).toHaveBeenCalledWith(
      "lsof",
      ["-F", "n", "-p", "100"],
      expect.any(Object),
    );
  });
});

describe("getRecentDocuments", () => {
  it("returns empty array when SFL4 file does not exist", () => {
    mockedExistsSync.mockReturnValue(false);
    expect(getRecentDocuments()).toEqual([]);
  });

  it("parses JXA JSON output correctly", () => {
    mockedExistsSync.mockReturnValue(true);
    mockedExecFileSync.mockReturnValue(
      JSON.stringify(["/tmp/recent1.pdf", "/tmp/recent2.pdf"]) as never,
    );

    const result = getRecentDocuments();
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("recent1");
    expect(result[0].path).toBe("/tmp/recent1.pdf");
    expect(result[1].name).toBe("recent2");
  });

  it("preserves recency order (does not sort)", () => {
    mockedExistsSync.mockReturnValue(true);
    mockedExecFileSync.mockReturnValue(
      JSON.stringify(["/tmp/zebra.pdf", "/tmp/alpha.pdf"]) as never,
    );

    const result = getRecentDocuments();
    expect(result[0].name).toBe("zebra");
    expect(result[1].name).toBe("alpha");
  });

  it("returns empty array when JXA fails", () => {
    mockedExistsSync.mockReturnValue(true);
    mockedExecFileSync.mockImplementation(() => {
      throw new Error("osascript failed");
    });
    expect(getRecentDocuments()).toEqual([]);
  });

  it("returns empty array when JXA returns empty JSON", () => {
    mockedExistsSync.mockReturnValue(true);
    mockedExecFileSync.mockReturnValue("[]" as never);

    const result = getRecentDocuments();
    expect(result).toEqual([]);
  });

  it("handles files with unicode names", () => {
    mockedExistsSync.mockReturnValue(true);
    mockedExecFileSync.mockReturnValue(
      JSON.stringify(["/tmp/Übungen für Prüfung.pdf"]) as never,
    );

    const result = getRecentDocuments();
    expect(result[0].name).toBe("Übungen für Prüfung");
    expect(result[0].fullName).toBe("Übungen für Prüfung.pdf");
  });
});
