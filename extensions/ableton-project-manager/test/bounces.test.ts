import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { findLatestBounce, isAudioFile, listBounces } from "../src/core/projects/bounces";

let tmpDir: string;

// 用真实临时目录 + 真实 mtime 做集成测试，这正是 findLatestBounce 的运行方式。
beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "asm-bounces-"));
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeWithMtime(name: string, mtimeMs: number): string {
  const filePath = path.join(tmpDir, name);
  fs.writeFileSync(filePath, "x");
  const seconds = mtimeMs / 1000;
  fs.utimesSync(filePath, seconds, seconds); // atime, mtime —— utimes 不改 birthtime
  return filePath;
}

describe("isAudioFile", () => {
  it("按后缀识别音频，忽略大小写；非音频返回 false", () => {
    expect(isAudioFile("mix.wav")).toBe(true);
    expect(isAudioFile("MIX.WAV")).toBe(true);
    expect(isAudioFile("master.mp3")).toBe(true);
    expect(isAudioFile("notes.txt")).toBe(false);
    expect(isAudioFile("song.als")).toBe(false);
  });
});

describe("listBounces", () => {
  it("只返回顶层音频文件，不递归子目录、忽略非音频", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "asm-list-"));
    fs.writeFileSync(path.join(dir, "a.wav"), "x");
    fs.writeFileSync(path.join(dir, "readme.txt"), "x");
    fs.mkdirSync(path.join(dir, "sub"));
    fs.writeFileSync(path.join(dir, "sub", "b.wav"), "x");

    const names = listBounces(dir).map((b) => b.name);
    expect(names).toEqual(["a.wav"]);

    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("目录不存在时返回空数组，不抛异常", () => {
    expect(listBounces(path.join(tmpDir, "nope"))).toEqual([]);
  });
});

describe("findLatestBounce", () => {
  it("按 mtime 选最新，而不是文件创建顺序(birthtime)", () => {
    // re-export 先创建(birthtime 更早)但 mtime 最新；old-export 后创建(birthtime 更晚)但 mtime 更旧。
    // mtime 与 birthtime 会给出相反赢家：正确实现按 mtime 必须选 re-export。
    const reExport = writeWithMtime("re-export.wav", Date.parse("2026-06-01T00:00:00Z"));
    const oldExport = writeWithMtime("old-export.wav", Date.parse("2026-01-01T00:00:00Z"));

    expect(findLatestBounce(tmpDir)).toBe(reExport);
    expect(findLatestBounce(tmpDir)).not.toBe(oldExport);
  });

  it("空目录返回 null", () => {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), "asm-empty-"));
    expect(findLatestBounce(empty)).toBeNull();
    fs.rmSync(empty, { recursive: true, force: true });
  });
});
