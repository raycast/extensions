import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { findMovedBounceFiles } from "../src/core/projects/external-bounce-repair";

// 固定的修改时间：2026-01-01 00:00:00 UTC。
const MTIME = new Date(Date.UTC(2026, 0, 1));

let root: string;
let own: string;
let shared: string;

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "asm-repair-"));
  own = path.join(root, "own");
  shared = path.join(root, "shared");
  fs.mkdirSync(own);
  fs.mkdirSync(shared);
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

// 写一个内容固定、修改时间固定的音频文件，返回它的指纹。
function writeBounce(file: string, content = "bounce"): { size: number; mtimeMs: number } {
  fs.writeFileSync(file, content);
  fs.utimesSync(file, MTIME, MTIME);
  const stats = fs.statSync(file);
  return { size: stats.size, mtimeMs: stats.mtimeMs };
}

describe("findMovedBounceFiles", () => {
  it("在同一个文件夹里改名后，能找回", () => {
    const oldPath = path.join(own, "Song v1.wav");
    const fingerprint = writeBounce(oldPath);
    const newPath = path.join(own, "Song v2.wav");
    fs.renameSync(oldPath, newPath);

    const moves = findMovedBounceFiles([oldPath], { [oldPath]: fingerprint }, shared);
    expect(moves.get(oldPath)).toBe(newPath);
  });

  it("移到共享文件夹以后，能找回", () => {
    const oldPath = path.join(own, "Song v1.wav");
    const fingerprint = writeBounce(oldPath);
    const newPath = path.join(shared, "Song v1.wav");
    fs.renameSync(oldPath, newPath);

    const moves = findMovedBounceFiles([oldPath], { [oldPath]: fingerprint }, shared);
    expect(moves.get(oldPath)).toBe(newPath);
  });

  it("有两个候选文件时，不找回", () => {
    const oldPath = path.join(own, "Song v1.wav");
    const fingerprint = writeBounce(oldPath);
    fs.renameSync(oldPath, path.join(own, "Song v2.wav"));
    writeBounce(path.join(own, "Song v3.wav"));

    const moves = findMovedBounceFiles([oldPath], { [oldPath]: fingerprint }, shared);
    expect(moves.size).toBe(0);
  });

  it("移到别处以后，找不回", () => {
    const oldPath = path.join(own, "Song v1.wav");
    const fingerprint = writeBounce(oldPath);
    const elsewhere = path.join(root, "elsewhere");
    fs.mkdirSync(elsewhere);
    fs.renameSync(oldPath, path.join(elsewhere, "Song v1.wav"));

    const moves = findMovedBounceFiles([oldPath], { [oldPath]: fingerprint }, shared);
    expect(moves.size).toBe(0);
  });
});
