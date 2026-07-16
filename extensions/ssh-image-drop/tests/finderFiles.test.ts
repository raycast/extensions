import { describe, it, expect } from "vitest";
import { dedupeByBasename, isTransferableFile } from "../src/lib/finderFiles";

const stat = (isFile: boolean, isDir = false) => ({
  isFile: () => isFile,
  isDirectory: () => isDir,
});

describe("isTransferableFile", () => {
  it("일반 파일은 전송 대상", () => {
    expect(isTransferableFile(stat(true))).toBe(true);
  });
  it("디렉토리는 제외", () => {
    expect(isTransferableFile(stat(false, true))).toBe(false);
  });
  it("비정규 파일(FIFO/socket/device: isFile=false)은 제외", () => {
    expect(isTransferableFile(stat(false))).toBe(false);
  });
});

describe("dedupeByBasename", () => {
  it("서로 다른 basename은 전부 kept", () => {
    const r = dedupeByBasename(["/a/x.png", "/b/y.png"]);
    expect(r.kept).toEqual(["/a/x.png", "/b/y.png"]);
    expect(r.dropped).toEqual([]);
  });
  it("동일 basename 후행은 dropped (첫 항목만 kept)", () => {
    const r = dedupeByBasename([
      "/a/report.pdf",
      "/b/report.pdf",
      "/c/report.pdf",
    ]);
    expect(r.kept).toEqual(["/a/report.pdf"]);
    expect(r.dropped).toEqual(["/b/report.pdf", "/c/report.pdf"]);
  });
  it("빈 입력", () => {
    expect(dedupeByBasename([])).toEqual({ kept: [], dropped: [] });
  });
});
