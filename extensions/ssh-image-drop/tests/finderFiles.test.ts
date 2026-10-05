import { describe, it, expect } from "vitest";
import { dedupeByBasename, isTransferable } from "../src/lib/finderFiles";

const stat = (isFile: boolean, isDir = false) => ({
  isFile: () => isFile,
  isDirectory: () => isDir,
});

describe("isTransferable", () => {
  it("일반 파일은 전송 대상", () => {
    expect(isTransferable(stat(true))).toBe(true);
  });
  it("디렉토리도 전송 대상 (scp -r 재귀 업로드)", () => {
    expect(isTransferable(stat(false, true))).toBe(true);
  });
  it("비정규 파일(FIFO/socket/device: 둘 다 false)은 제외", () => {
    expect(isTransferable(stat(false))).toBe(false);
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
