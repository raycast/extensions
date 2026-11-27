import { describe, expect, it, vi, beforeEach } from "vitest";
import { execFileSync } from "child_process";

vi.mock("child_process", () => ({
  execFileSync: vi.fn(),
}));

vi.mock("fs", () => ({
  existsSync: vi.fn(() => true),
  statSync: vi.fn(() => ({ ctimeMs: 0 })),
}));

const mockedExecFileSync = vi.mocked(execFileSync);

import {
  copyPageImageToClipboard,
  getCurrentPageNumber,
  getFrontWindowTitle,
  pickCurrentDocument,
} from "../../src/lib/current-page";
import { PdfFile } from "../../src/lib/pdf-expert";

function pdf(path: string): PdfFile {
  const fullName = path.split("/").pop()!;
  return {
    name: fullName.replace(/\.pdf$/i, ""),
    fullName,
    path,
    folder: path.slice(0, path.lastIndexOf("/")),
    exists: true,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("pickCurrentDocument", () => {
  const tabs = [pdf("/a/notes.pdf"), pdf("/b/slides.pdf"), pdf("/c/notes.pdf")];
  const changedAt = (path: string) =>
    ({ "/a/notes.pdf": 100, "/b/slides.pdf": 300, "/c/notes.pdf": 200 })[
      path
    ] ?? 0;

  it("returns null when there are no tabs", () => {
    expect(pickCurrentDocument([], "notes", changedAt)).toBeNull();
  });

  it("picks the tab whose name matches the window title", () => {
    expect(pickCurrentDocument(tabs, "slides", changedAt)?.path).toBe(
      "/b/slides.pdf",
    );
  });

  it("breaks title ties by the most recently changed file", () => {
    expect(pickCurrentDocument(tabs, "notes", changedAt)?.path).toBe(
      "/c/notes.pdf",
    );
  });

  it("falls back to the most recently changed tab when the title matches nothing", () => {
    expect(pickCurrentDocument(tabs, "something else", changedAt)?.path).toBe(
      "/b/slides.pdf",
    );
    expect(pickCurrentDocument(tabs, null, changedAt)?.path).toBe(
      "/b/slides.pdf",
    );
  });
});

describe("getFrontWindowTitle", () => {
  it("returns the trimmed window name from System Events", () => {
    mockedExecFileSync.mockReturnValue(
      "lesson 2 - exam exercise 3.1\n" as never,
    );
    expect(getFrontWindowTitle()).toBe("lesson 2 - exam exercise 3.1");
    expect(mockedExecFileSync.mock.calls[0][0]).toBe("osascript");
  });

  it("asks for the main standard window, not window 1 (which may be a nameless dialog)", () => {
    mockedExecFileSync.mockReturnValue("notes\n" as never);
    getFrontWindowTitle();
    const script = String(mockedExecFileSync.mock.calls[0][1]?.[1]);
    expect(script).toContain("AXStandardWindow");
    expect(script).toContain("AXMain");
    expect(script).not.toMatch(/window 1/);
  });

  it("returns null when osascript fails (e.g. missing permission)", () => {
    mockedExecFileSync.mockImplementation(() => {
      throw new Error("not authorized");
    });
    expect(getFrontWindowTitle()).toBeNull();
  });
});

describe("getCurrentPageNumber", () => {
  it("reads the xattr as hex and decodes pageNumber via osascript", () => {
    mockedExecFileSync
      .mockReturnValueOnce("62 70 6C 69 73 74\n30 30\n" as never) // xattr -px
      .mockReturnValueOnce("19\n" as never); // osascript
    expect(getCurrentPageNumber("/a/notes.pdf")).toBe(19);

    const [cmd, args] = mockedExecFileSync.mock.calls[0];
    expect(cmd).toBe("xattr");
    expect(args).toEqual(["-px", "com.readdle.LastPosition", "/a/notes.pdf"]);

    const [cmd2, args2] = mockedExecFileSync.mock.calls[1];
    expect(cmd2).toBe("osascript");
    // hex "62706c69737430 30" -> base64 "YnBsaXN0MDA=" must be passed to the decoder
    expect(args2).toContain("YnBsaXN0MDA=");
  });

  it("decodes the archive with secure coding and an explicit class allow-list", () => {
    mockedExecFileSync.mockReturnValueOnce("00\n" as never).mockReturnValueOnce("1\n" as never);
    getCurrentPageNumber("/a/notes.pdf");
    const script = String(mockedExecFileSync.mock.calls[1][1]?.[3]);
    expect(script).not.toContain("requiresSecureCoding = false");
    expect(script).toContain("unarchivedObjectOfClassesFromDataError");
  });

  it("returns null when the file has no LastPosition xattr", () => {
    mockedExecFileSync.mockImplementation(() => {
      throw new Error("No such xattr");
    });
    expect(getCurrentPageNumber("/a/notes.pdf")).toBeNull();
  });

  it("returns null when the decoded value is not a positive integer", () => {
    mockedExecFileSync
      .mockReturnValueOnce("00\n" as never)
      .mockReturnValueOnce("null\n" as never);
    expect(getCurrentPageNumber("/a/notes.pdf")).toBeNull();
  });
});

describe("copyPageImageToClipboard", () => {
  it("passes path, 0-based page index and dpi to osascript and returns the result", () => {
    mockedExecFileSync.mockReturnValue(
      '{"width":1785,"height":2526,"pageCount":24}\n' as never,
    );
    const result = copyPageImageToClipboard("/a/notes.pdf", 19, 216);
    expect(result).toEqual({ width: 1785, height: 2526, pageCount: 24 });

    const [cmd, args] = mockedExecFileSync.mock.calls[0];
    expect(cmd).toBe("osascript");
    expect((args as string[]).slice(-3)).toEqual(["/a/notes.pdf", "18", "216"]);
  });

  it("throws the script's error message when rendering fails", () => {
    mockedExecFileSync.mockReturnValue(
      '{"error":"Page 30 is out of range (24 pages)"}' as never,
    );
    expect(() => copyPageImageToClipboard("/a/notes.pdf", 30, 216)).toThrow(
      "Page 30 is out of range (24 pages)",
    );
  });
});
