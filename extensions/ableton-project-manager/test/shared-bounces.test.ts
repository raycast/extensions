import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  assignSharedBounces,
  bounceMatchesTitle,
  collectBounces,
  setSharedBounceTitles,
  sharedBounceFilesFor,
} from "../src/core/projects/bounces";
import { __setPreferences } from "./mocks/raycast-api";

let shared: string;

beforeEach(() => {
  shared = fs.mkdtempSync(path.join(os.tmpdir(), "asm-shared-"));
  __setPreferences({ sharedBouncesFolder: shared });
});

afterEach(() => {
  __setPreferences({});
  setSharedBounceTitles([]);
  fs.rmSync(shared, { recursive: true, force: true });
});

describe("bounceMatchesTitle", () => {
  it("项目名后面是结尾、空格、-、_、. 时算匹配，不区分大小写", () => {
    expect(bounceMatchesTitle("Song.wav", "Song")).toBe(true);
    expect(bounceMatchesTitle("Song v2.wav", "Song")).toBe(true);
    expect(bounceMatchesTitle("song-master.wav", "Song")).toBe(true);
    expect(bounceMatchesTitle("SONG_final.mp3", "Song")).toBe(true);
    expect(bounceMatchesTitle("Song.v3.aiff", "Song")).toBe(true);
  });

  it("项目名后面紧跟字母、数字时不算，文件名里只是包含项目名也不算", () => {
    expect(bounceMatchesTitle("Songbird.wav", "Song")).toBe(false);
    expect(bounceMatchesTitle("Song2.wav", "Song")).toBe(false);
    expect(bounceMatchesTitle("My Song.wav", "Song")).toBe(false);
  });
});

describe("assignSharedBounces", () => {
  it("同时对上好几个项目时归名字最长的那个；对不上的和非音频不出现", () => {
    const result = assignSharedBounces(
      ["Demo.wav", "Demo Package v2.wav", "Other.wav", "Demo Package.txt"],
      ["Demo", "Demo Package"],
    );
    expect(result.get("Demo")).toEqual(["Demo.wav"]);
    expect(result.get("Demo Package")).toEqual(["Demo Package v2.wav"]);
    expect([...result.keys()].sort()).toEqual(["Demo", "Demo Package"]);
  });
});

describe("sharedBounceFilesFor", () => {
  it("返回共享文件夹里归这个项目的完整路径，不进子文件夹", () => {
    fs.writeFileSync(path.join(shared, "Demo Package.wav"), "x");
    fs.mkdirSync(path.join(shared, "Stems"));
    fs.writeFileSync(path.join(shared, "Stems", "Demo Package Drums.wav"), "x");
    setSharedBounceTitles(["Demo", "Demo Package"]);

    expect(sharedBounceFilesFor("Demo Package")).toEqual([path.join(shared, "Demo Package.wav")]);
    expect(sharedBounceFilesFor("Demo")).toEqual([]);
  });

  it("没设共享文件夹，或文件夹不存在时为空", () => {
    fs.writeFileSync(path.join(shared, "Song.wav"), "x");
    setSharedBounceTitles(["Song"]);

    __setPreferences({});
    expect(sharedBounceFilesFor("Song")).toEqual([]);

    __setPreferences({ sharedBouncesFolder: path.join(shared, "unplugged") });
    expect(sharedBounceFilesFor("Song")).toEqual([]);
  });

  it("项目名单更新后重新分配", () => {
    fs.writeFileSync(path.join(shared, "Demo Package.wav"), "x");
    setSharedBounceTitles(["Demo"]);
    expect(sharedBounceFilesFor("Demo")).toEqual([path.join(shared, "Demo Package.wav")]);

    setSharedBounceTitles(["Demo", "Demo Package"]);
    expect(sharedBounceFilesFor("Demo")).toEqual([]);
  });
});

describe("collectBounces 的共享来源", () => {
  it("共享文件记为 shared；和默认文件夹重复时只留默认文件夹那份；读不到的跳过", () => {
    const projectBounces = fs.mkdtempSync(path.join(os.tmpdir(), "asm-project-"));
    const own = path.join(projectBounces, "Song.wav");
    fs.writeFileSync(own, "x");
    const sharedFile = path.join(shared, "Song v2.wav");
    fs.writeFileSync(sharedFile, "x");

    const result = collectBounces({
      defaultFolder: projectBounces,
      sharedFiles: [sharedFile, own, path.join(shared, "Song gone.wav")],
    });
    expect(result.map((bounce) => [bounce.path, bounce.source, bounce.available])).toEqual([
      [own, "project", true],
      [sharedFile, "shared", true],
    ]);

    fs.rmSync(projectBounces, { recursive: true, force: true });
  });
});
