import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { logicAdapter } from "@/daws/logic/adapter";
import { parseBinaryPlist, readPlistFile } from "@/daws/logic/bplist";

type Fixture = string | number | boolean | Fixture[] | { [key: string]: Fixture };

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function toXml(value: Fixture): string {
  if (typeof value === "string") return `<string>${escapeXml(value)}</string>`;
  if (typeof value === "boolean") return value ? "<true/>" : "<false/>";
  if (typeof value === "number")
    return Number.isInteger(value) ? `<integer>${value}</integer>` : `<real>${value}</real>`;
  if (Array.isArray(value)) return `<array>${value.map(toXml).join("")}</array>`;
  const entries = Object.entries(value).map(([key, item]) => `<key>${escapeXml(key)}</key>${toXml(item)}`);
  return `<dict>${entries.join("")}</dict>`;
}

// 先写 XML，再用系统的 plutil 转成二进制：和 Logic 一样由系统写出，不是测试自己拼的字节。
function writeBinaryPlist(filePath: string, value: Fixture) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">${toXml(value)}</plist>
`,
  );
  execFileSync("/usr/bin/plutil", ["-convert", "binary1", filePath]);
}

function writeAlternative(packagePath: string, index: string, metadata: Fixture) {
  const dir = path.join(packagePath, "Alternatives", index);
  writeBinaryPlist(path.join(dir, "MetaData.plist"), metadata);
  fs.writeFileSync(path.join(dir, "ProjectData"), "x");
}

function songMetadata(bpm: number, key: string, scale: string, numerator: number, denominator: number): Fixture {
  return {
    BeatsPerMinute: bpm,
    SongKey: key,
    SongGenderKey: scale,
    SongSignatureNumerator: numerator,
    SongSignatureDenominator: denominator,
  };
}

let root: string;
let packagePath: string;
let folderPath: string;
let innerPackagePath: string;
let barePackagePath: string;

beforeAll(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "lpm-logic-"));

  // Package 形态：两个 Alternative，当前打开的是 001；000 里有一份备份，Alternatives 里有 .DS_Store。
  packagePath = path.join(root, "Song.logicx");
  writeBinaryPlist(path.join(packagePath, "Resources", "ProjectInformation.plist"), {
    ActiveVariant: 1,
    VariantNames: { "0": "Old", "1": "Old #1" },
    VariantNamesV2: { "0": "{PROJECT_NAME}", "1": "{PROJECT_NAME} #1" },
  });
  writeAlternative(packagePath, "000", songMetadata(77.5, "F#", "major", 6, 8));
  writeAlternative(packagePath, "001", songMetadata(100, "G#", "minor", 3, 4));
  writeBinaryPlist(
    path.join(packagePath, "Alternatives", "000", "Project File Backups", "00", "MetaData.plist"),
    songMetadata(90, "C", "major", 4, 4),
  );
  fs.writeFileSync(path.join(packagePath, "Alternatives", ".DS_Store"), "x");

  // Folder 形态：外层文件夹改过名，里面的包还是旧名字。
  folderPath = path.join(root, "Folder Song");
  innerPackagePath = path.join(folderPath, "Old Name.logicx");
  fs.mkdirSync(path.join(folderPath, "Audio Files"), { recursive: true });
  writeBinaryPlist(path.join(innerPackagePath, "Resources", "ProjectInformation.plist"), {
    ActiveVariant: 0,
    VariantNamesV2: { "0": "{PROJECT_NAME}" },
  });
  writeAlternative(innerPackagePath, "000", songMetadata(120, "A", "minor", 4, 4));

  // 没有 ProjectInformation.plist 的包，Key 用降号和非大小调写法。
  barePackagePath = path.join(root, "Bare.logicx");
  writeAlternative(barePackagePath, "000", songMetadata(140, "Eb", "dorian", 7, 8));

  fs.mkdirSync(path.join(root, "Not A Project"));
  fs.writeFileSync(path.join(root, "notes.txt"), "x");
});

afterAll(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

describe("parseBinaryPlist", () => {
  it("和 plutil 的解析结果一致", () => {
    const file = path.join(root, "fixture.plist");
    writeBinaryPlist(file, {
      ascii: "Demo",
      unicode: "A♭ 小调草稿",
      long: "x".repeat(40),
      int8: 7,
      int16: 300,
      int32: 70000,
      negative: -1,
      real: 77.5,
      yes: true,
      no: false,
      list: Array.from({ length: 20 }, (_, i) => i),
      nested: { a: ["b", { c: 1 }] },
    });
    const expected: unknown = JSON.parse(
      execFileSync("/usr/bin/plutil", ["-convert", "json", "-o", "-", file], { encoding: "utf8" }),
    );
    expect(readPlistFile(file)).toEqual(expected);
  });

  it("不是二进制 plist 时抛出", () => {
    expect(() => parseBinaryPlist(Buffer.from('<?xml version="1.0"?><plist version="1.0"><dict/></plist>'))).toThrow();
  });
});

describe("logicAdapter.detectProject", () => {
  it("认出 Package 和 Folder 两种形态", () => {
    expect(logicAdapter.detectProject(packagePath, "Song.logicx")).toEqual({
      id: "Song",
      folderPath: packagePath,
      kind: "package",
    });
    expect(logicAdapter.detectProject(folderPath, "Folder Song")).toEqual({
      id: "Folder Song",
      folderPath,
      kind: "folder",
    });
  });

  it("没有 .logicx 的文件夹和普通文件不是项目", () => {
    expect(logicAdapter.detectProject(path.join(root, "Not A Project"), "Not A Project")).toBeNull();
    expect(logicAdapter.detectProject(path.join(root, "notes.txt"), "notes.txt")).toBeNull();
  });

  it("id 和条目名可以互相换算", () => {
    expect(logicAdapter.projectIdForEntry(logicAdapter.entryNameFor("Song", "package"))).toBe("Song");
    expect(logicAdapter.projectIdForEntry(logicAdapter.entryNameFor("Song", "folder"))).toBe("Song");
  });
});

describe("logicAdapter.listSets", () => {
  it("每个 Alternative 一个 Set，名字来自 VariantNamesV2，标出 Active，不含备份", () => {
    const sets = logicAdapter.listSets({ folderPath: packagePath, kind: "package" });
    const byIndex = [...sets].sort((a, b) => a.metadataFile.localeCompare(b.metadataFile));
    expect(byIndex.map((set) => [set.name, set.active])).toEqual([
      ["Song", false],
      ["Song #1", true],
    ]);
    expect(sets.every((set) => set.path === packagePath)).toBe(true);
    expect(sets.find((set) => set.active)?.metadataFile).toBe(
      path.join(packagePath, "Alternatives", "001", "MetaData.plist"),
    );
  });

  it("Folder 形态读里面的包，名字用包名而不是文件夹名", () => {
    const sets = logicAdapter.listSets({ folderPath, kind: "folder" });
    expect(sets).toEqual([expect.objectContaining({ name: "Old Name", path: innerPackagePath, active: true })]);
  });

  it("Folder 里有多个包时，读最后保存的那个，不管名字", () => {
    const versionsPath = path.join(root, "Versions");
    const original = path.join(versionsPath, "Versions.logicx");
    const newer = path.join(versionsPath, "Versions v2.logicx");
    writeAlternative(original, "000", songMetadata(90, "C", "major", 4, 4));
    writeAlternative(newer, "000", songMetadata(128, "D", "minor", 4, 4));
    fs.utimesSync(path.join(original, "Alternatives", "000", "ProjectData"), 2000, 2000);
    fs.utimesSync(path.join(newer, "Alternatives", "000", "ProjectData"), 3000, 3000);

    const sets = logicAdapter.listSets({ folderPath: versionsPath, kind: "folder" });
    expect(sets.map((set) => set.path)).toEqual([newer]);
  });

  it("Folder 里几个包保存时间一样时，优先和文件夹同名的", () => {
    const tiePath = path.join(root, "Tie");
    const other = path.join(tiePath, "A Other.logicx");
    const sameName = path.join(tiePath, "Tie.logicx");
    writeAlternative(other, "000", songMetadata(90, "C", "major", 4, 4));
    writeAlternative(sameName, "000", songMetadata(90, "C", "major", 4, 4));
    fs.utimesSync(path.join(other, "Alternatives", "000", "ProjectData"), 2000, 2000);
    fs.utimesSync(path.join(sameName, "Alternatives", "000", "ProjectData"), 2000, 2000);

    const sets = logicAdapter.listSets({ folderPath: tiePath, kind: "folder" });
    expect(sets.map((set) => set.path)).toEqual([sameName]);
  });

  it("没有 ProjectInformation.plist 时名字退回编号；只有一个 Alternative 时仍算 Active", () => {
    const sets = logicAdapter.listSets({ folderPath: barePackagePath, kind: "package" });
    expect(sets).toEqual([expect.objectContaining({ name: "000", active: true })]);
  });

  it("没有 ProjectInformation.plist 时名字退回编号；有两个 Alternative 时都不算 Active", () => {
    const twoPackagePath = path.join(root, "Two.logicx");
    writeAlternative(twoPackagePath, "000", songMetadata(120, "C", "major", 4, 4));
    writeAlternative(twoPackagePath, "001", songMetadata(120, "C", "major", 4, 4));

    const sets = logicAdapter.listSets({ folderPath: twoPackagePath, kind: "package" });
    const byIndex = [...sets].sort((a, b) => a.metadataFile.localeCompare(b.metadataFile));
    expect(byIndex.map((set) => [set.name, set.active])).toEqual([
      ["000", false],
      ["001", false],
    ]);
  });

  it("只有一个 Alternative、没有 ActiveVariant 时，它是 Active", () => {
    const singlePackagePath = path.join(root, "Single.logicx");
    writeBinaryPlist(path.join(singlePackagePath, "Resources", "ProjectInformation.plist"), {
      VariantNamesV2: { "0": "{PROJECT_NAME}" },
    });
    writeAlternative(singlePackagePath, "000", songMetadata(120, "C", "major", 4, 4));

    const sets = logicAdapter.listSets({ folderPath: singlePackagePath, kind: "package" });
    expect(sets).toEqual([
      {
        name: "Single",
        path: singlePackagePath,
        metadataFile: path.join(singlePackagePath, "Alternatives", "000", "MetaData.plist"),
        createdAt: expect.any(Number),
        modifiedAt: expect.any(Number),
        active: true,
      },
    ]);
  });

  it("只有一个 Alternative、ActiveVariant 指向不存在的编号时，它是 Active", () => {
    const singlePackagePath = path.join(root, "Single Mismatch.logicx");
    writeBinaryPlist(path.join(singlePackagePath, "Resources", "ProjectInformation.plist"), {
      ActiveVariant: 5,
      VariantNamesV2: { "0": "{PROJECT_NAME}" },
    });
    writeAlternative(singlePackagePath, "000", songMetadata(120, "C", "major", 4, 4));

    const sets = logicAdapter.listSets({ folderPath: singlePackagePath, kind: "package" });
    expect(sets).toEqual([
      {
        name: "Single Mismatch",
        path: singlePackagePath,
        metadataFile: path.join(singlePackagePath, "Alternatives", "000", "MetaData.plist"),
        createdAt: expect.any(Number),
        modifiedAt: expect.any(Number),
        active: true,
      },
    ]);
  });
});

describe("logicAdapter.parseSet", () => {
  async function metadataByName(project: { folderPath: string; kind: "folder" | "package" }) {
    const result: Record<string, unknown> = {};
    for (const set of logicAdapter.listSets(project)) result[set.name] = await logicAdapter.parseSet(set);
    return result;
  }

  it("读出 BPM、拍号，Key 换成 Ableton 的写法", async () => {
    expect(await metadataByName({ folderPath: packagePath, kind: "package" })).toEqual({
      Song: { bpm: 77.5, timeSignature: "6/8", key: "F♯/G♭ Major" },
      "Song #1": { bpm: 100, timeSignature: "3/4", key: "A♭ Minor" },
    });
    expect(await metadataByName({ folderPath, kind: "folder" })).toEqual({
      "Old Name": { bpm: 120, timeSignature: "4/4", key: "A Minor" },
    });
  });

  it("降号写法也认，不认识的音阶首字母大写", async () => {
    expect(await metadataByName({ folderPath: barePackagePath, kind: "package" })).toEqual({
      "000": { bpm: 140, timeSignature: "7/8", key: "E♭ Dorian" },
    });
  });

  it("文件读不了时各字段为 null", async () => {
    const [set] = logicAdapter.listSets({ folderPath: packagePath, kind: "package" });
    const broken = { ...set, metadataFile: path.join(root, "notes.txt") };
    expect(await logicAdapter.parseSet(broken)).toEqual({ bpm: null, timeSignature: null, key: null });
  });
});
