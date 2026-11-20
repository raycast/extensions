import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  assignSharedBounces,
  checkBounceAlias,
  guessAliasFromFileName,
  setSharedBounceAliases,
  setSharedBounceTitles,
  sharedBounceFilesFor,
  unmatchedSharedBounces,
} from "../src/core/projects/bounces";
import { __setPreferences } from "./mocks/raycast-api";

let shared: string;

// 建一个 bounce 文件，mtime 设成指定的秒数，方便测排序。
function writeBounce(name: string, mtimeSeconds = 1_700_000_000): string {
  const file = path.join(shared, name);
  fs.writeFileSync(file, "x");
  fs.utimesSync(file, mtimeSeconds, mtimeSeconds);
  return file;
}

beforeEach(() => {
  shared = fs.mkdtempSync(path.join(os.tmpdir(), "asm-unmatched-"));
  __setPreferences({ sharedBouncesFolder: shared });
});

afterEach(() => {
  __setPreferences({});
  setSharedBounceTitles([]);
  setSharedBounceAliases({});
  fs.rmSync(shared, { recursive: true, force: true });
});

describe("assignSharedBounces 的别名", () => {
  it("文件名以别名开头时归别名所属的项目，规则和项目名一样", () => {
    const result = assignSharedBounces(["SC v2.wav", "SCAR.wav", "sc.mp3"], ["Some Cool Song"], {
      "Some Cool Song": ["SC"],
    });
    expect(result.get("Some Cool Song")).toEqual(["SC v2.wav", "sc.mp3"]);
  });

  it("别名和项目名一起比长短，归最长的那个", () => {
    const result = assignSharedBounces(["Demo Pk v1.wav", "Demo v1.wav"], ["Demo", "Demo Package"], {
      "Demo Package": ["Demo Pk"],
    });
    expect(result.get("Demo Package")).toEqual(["Demo Pk v1.wav"]);
    expect(result.get("Demo")).toEqual(["Demo v1.wav"]);
  });
});

describe("sharedBounceFilesFor 和别名", () => {
  it("别名更新后重新分配", () => {
    const file = writeBounce("SC v2.wav");
    setSharedBounceTitles(["Some Cool Song"]);
    expect(sharedBounceFilesFor("Some Cool Song")).toEqual([]);

    setSharedBounceAliases({ "Some Cool Song": ["SC"] });
    expect(sharedBounceFilesFor("Some Cool Song")).toEqual([file]);
  });
});

describe("unmatchedSharedBounces", () => {
  it("列出没归到项目、也没被手动登记的 bounce，最近修改的在前；不进子文件夹，不含非音频", () => {
    writeBounce("Song.wav");
    const older = writeBounce("Mystery A.wav", 1_700_000_000);
    const newer = writeBounce("Mystery B.wav", 1_700_000_100);
    const claimed = writeBounce("Claimed.wav");
    fs.writeFileSync(path.join(shared, "notes.txt"), "x");
    fs.mkdirSync(path.join(shared, "Stems"));
    fs.writeFileSync(path.join(shared, "Stems", "Loose.wav"), "x");
    setSharedBounceTitles(["Song"]);

    expect(unmatchedSharedBounces([claimed]).map((bounce) => bounce.path)).toEqual([newer, older]);
  });

  it("没设共享文件夹时为空", () => {
    writeBounce("Mystery.wav");
    __setPreferences({});
    expect(unmatchedSharedBounces([])).toEqual([]);
  });
});

describe("guessAliasFromFileName", () => {
  it("取第一个空格、-、_、. 之前的部分", () => {
    expect(guessAliasFromFileName("SC v2.wav")).toBe("SC");
    expect(guessAliasFromFileName("SC-master.wav")).toBe("SC");
    expect(guessAliasFromFileName("SC_final.aiff")).toBe("SC");
    expect(guessAliasFromFileName("SC.v3.wav")).toBe("SC");
    expect(guessAliasFromFileName("Untitled.wav")).toBe("Untitled");
  });
});

describe("checkBounceAlias", () => {
  const titles = ["Demo", "Some Cool Song"];
  const aliases = { "Some Cool Song": ["SC"] };

  it("空的不行", () => {
    expect(checkBounceAlias("  ", "Demo", titles, aliases)).toBe("empty");
  });

  it("和另一个项目的名字或别名一样（不区分大小写）不行，并给出那个项目", () => {
    expect(checkBounceAlias("demo", "Some Cool Song", titles, aliases)).toEqual({ taken: "Demo" });
    expect(checkBounceAlias("sc", "Demo", titles, aliases)).toEqual({ taken: "Some Cool Song" });
  });

  it("自己的名字和别名不算冲突", () => {
    expect(checkBounceAlias("SC", "Some Cool Song", titles, aliases)).toBeNull();
    expect(checkBounceAlias("Demo", "Demo", titles, aliases)).toBeNull();
    expect(checkBounceAlias("DP", "Demo", titles, aliases)).toBeNull();
  });
});
