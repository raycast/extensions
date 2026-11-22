import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Project } from "@/core/projects/types";
import { applyProjectMetadata } from "@/core/ui/shared/reload-projects";
import { createReloadQueue } from "@/core/ui/projects/reload-queue";
import { __setPreferences, environment } from "./mocks/raycast-api";

function makeProject(id: string): Project {
  return {
    id,
    title: id,
    folderPath: `/p/${id}`,
    kind: "package",
    createdAt: 0,
    inode: 0,
    modifiedAt: 0,
    stageId: null,
    genreIds: [],
    collectionIds: [],
    notes: "",
    lyrics: "",
    pinned: false,
    pinOrder: null,
    setsCount: 1,
    bouncesCount: 0,
    projectFilesCount: null,
    externalBounceFolders: [],
    externalBounceFiles: [],
  };
}

// 每个项目要读笔记和歌词两个文件，读到的路径就是「这个项目被读了」的证据。
function readProjects(spy: { mock: { calls: unknown[][] } }): string[] {
  return spy.mock.calls.map((call) => String(call[0])).filter((file) => file.startsWith("/p/"));
}

// 项目要够多：作废和补跑都发生在定时器里，项目太少会在定时器触发前就读完。
const MANY = Array.from({ length: 10000 }, (_, i) => makeProject(`p${i}`));

beforeEach(() => {
  // 自定义文档文件夹会记在 supportPath 里：换成空目录，免得读到别的用例留下的设置。
  environment.supportPath = fs.mkdtempSync(path.join(os.tmpdir(), "asm-support-"));
  __setPreferences({});
});

afterEach(() => {
  vi.restoreAllMocks();
  __setPreferences({});
});

describe("applyProjectMetadata", () => {
  it("作废后不再读剩下的项目", async () => {
    const readFileSync = vi.spyOn(fs, "readFileSync");
    let cancelled = false;
    // 真实时序：作废发生在另一个宏任务里，不是读取过程中同步改的。
    setTimeout(() => {
      cancelled = true;
    }, 0);

    const updated = await applyProjectMetadata(MANY, () => cancelled);

    const read = readProjects(readFileSync);
    expect(cancelled).toBe(true);
    // 远没读完：作废后剩下的项目没碰磁盘。
    expect(read.length).toBeLessThan(MANY.length);
    // 没读到的项目原样保留，列表不丢。
    expect(updated).toHaveLength(MANY.length);
    expect(updated[MANY.length - 1]).toBe(MANY[MANY.length - 1]);
  });

  it("没作废时读完所有项目", async () => {
    const readFileSync = vi.spyOn(fs, "readFileSync");
    const base = [makeProject("a"), makeProject("b")];

    const updated = await applyProjectMetadata(base, () => false);

    expect(readProjects(readFileSync)).toHaveLength(4);
    expect(updated).toHaveLength(2);
  });
});

describe("createReloadQueue", () => {
  it("刷新进行中再次触发，第一轮跑完并提交，之后补跑一轮，最终列表是第二轮的结果", async () => {
    const queue = createReloadQueue();
    let round = 0;
    // 每轮跑完提交的列表，用来确认第一轮没被叫停。
    const committed: string[][] = [];
    const runOnce = async (): Promise<string[]> => {
      const current = ++round;
      const updated = await applyProjectMetadata(MANY, () => false);
      const ids = updated.map((project) => `${project.id}:${current}`);
      committed.push(ids);
      return ids;
    };

    const first = queue.reload(runOnce);
    // 第一轮读到一半时再触发一次：这一轮照常跑完，结束后补跑一轮。
    await new Promise((resolve) => setTimeout(resolve, 0));
    const second = queue.reload(runOnce);
    const result = await second;
    await first;

    // 补跑了一轮，最终列表来自第二轮。
    expect(round).toBe(2);
    expect(result).toHaveLength(MANY.length);
    expect(result.every((id) => id.endsWith(":2"))).toBe(true);
    // 第一轮没被叫停：读完了全部项目并提交。
    expect(committed[0]).toHaveLength(MANY.length);
    expect(committed[0].every((id) => id.endsWith(":1"))).toBe(true);
  });
});
