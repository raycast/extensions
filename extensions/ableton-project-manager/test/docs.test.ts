import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DocFolderMissingError,
  DocSharedError,
  alteredDocChars,
  archiveDocFiles,
  displayDoc,
  docFilePath,
  docFolderIsCaseSensitive,
  docNameTakenBy,
  docRenameConflicts,
  docSharedWith,
  ensureDocFile,
  readDocFile,
  renameDocFiles,
  restoreArchivedDoc,
  setKnownProjectTitles,
  softBreaksToHard,
  writeDocBody,
} from "../src/core/docs/docs";
import { __setPreferences, environment } from "./mocks/raycast-api";

let notes: string;
const project = (title: string) => ({ title, folderPath: "/p" });

beforeEach(() => {
  notes = fs.mkdtempSync(path.join(os.tmpdir(), "asm-notes-"));
  environment.supportPath = fs.mkdtempSync(path.join(os.tmpdir(), "asm-support-"));
  __setPreferences({ notesFolder: notes });
});

afterEach(() => {
  __setPreferences({});
  fs.rmSync(notes, { recursive: true, force: true });
});

describe("docFilePath", () => {
  it("普通名字保持原文件名", () => {
    expect(docFilePath(project("Song-A"), "notes")).toBe(path.join(notes, "Song-A.md"));
  });

  it("非法字符替换为全角，且不与相近名字撞名", () => {
    expect(docFilePath(project("Song?A"), "notes")).toBe(path.join(notes, "Song？A.md"));
    expect(docFilePath(project("Beat #3"), "notes")).toBe(path.join(notes, "Beat ＃3.md"));
    expect(docFilePath(project("Song?A"), "notes")).not.toBe(docFilePath(project("Song-A"), "notes"));
  });

  it("首尾空格保留，不与无空格的名字撞名", () => {
    expect(docFilePath(project(" Song "), "notes")).toBe(path.join(notes, " Song .md"));
    expect(docFilePath(project(" Song "), "notes")).not.toBe(docFilePath(project("Song"), "notes"));
  });

  it("未设自定义文件夹时存进项目文件夹，用固定名", () => {
    __setPreferences({});
    expect(docFilePath(project("Song?A"), "notes")).toBe("/p/Notes.md");
  });
});

describe("alteredDocChars", () => {
  it("设了自定义文件夹时返回会被替换的字符（去重）", () => {
    expect(alteredDocChars("Beat #3 #4?")).toEqual(["#", "?"]);
    expect(alteredDocChars("Normal Name")).toEqual([]);
  });

  it("没设自定义文件夹时不提示", () => {
    __setPreferences({});
    expect(alteredDocChars("Beat #3")).toEqual([]);
  });
});

describe("换行显示", () => {
  it("单个换行转为硬换行；空行、代码块及其前一行不动", () => {
    const input = ["line 1", "line 2", "", "para", "```", "code a", "code b", "```"].join("\n");
    const expected = ["line 1  ", "line 2", "", "para", "```", "code a", "code b", "```"].join("\n");
    expect(softBreaksToHard(input)).toBe(expected);
  });

  it("默认（非严格）模拟 Obsidian", () => {
    expect(displayDoc("a\nb")).toBe("a  \nb");
  });

  it("开启 Strict Line Breaks 时原样返回", () => {
    __setPreferences({ notesFolder: notes, strictLineBreaks: true });
    expect(displayDoc("a\nb")).toBe("a\nb");
  });
});

describe("改名", () => {
  it("只改大小写时正常改名，不报冲突", () => {
    fs.writeFileSync(path.join(notes, "song.md"), "x");
    expect(docRenameConflicts("song", "Song")).toEqual([]);
    expect(renameDocFiles("song", "Song")).toEqual({ conflicts: [], failures: [] });
    expect(fs.readdirSync(notes)).toEqual(["Song.md"]);
  });

  it("目标是源文件本身（同一 inode）时直接改名，不报冲突", () => {
    // 用硬链接模拟"不区分大小写的卷上只改大小写"：两个名字指向同一个文件。
    fs.writeFileSync(path.join(notes, "Old.md"), "x");
    fs.linkSync(path.join(notes, "Old.md"), path.join(notes, "New.md"));
    expect(docRenameConflicts("Old", "New")).toEqual([]);
    expect(renameDocFiles("Old", "New")).toEqual({ conflicts: [], failures: [] });
    // POSIX rename 遇到"两个路径本来就是同一个文件"时什么都不做，所以硬链接下旧名字仍在；
    // 关键是没报冲突、内容没丢。真实的只改大小写由上一条用例覆盖。
    expect(fs.readFileSync(path.join(notes, "New.md"), "utf8")).toBe("x");
  });

  it("目标已存在时预检报出文件名，改名不覆盖", () => {
    fs.writeFileSync(path.join(notes, "Old.md"), "old");
    fs.writeFileSync(path.join(notes, "New.md"), "other");
    expect(docRenameConflicts("Old", "New")).toEqual(["New.md"]);
    expect(renameDocFiles("Old", "New").conflicts).toEqual(["notes"]);
    expect(fs.readFileSync(path.join(notes, "New.md"), "utf8")).toBe("other");
  });
});

describe("删除归档与放回还原", () => {
  it("移进 Deleted Projects/，同名依次编号；还原后内容一致", () => {
    fs.mkdirSync(path.join(notes, "Deleted Projects"));
    fs.writeFileSync(path.join(notes, "Deleted Projects", "Song.md"), "older");
    fs.writeFileSync(path.join(notes, "Song.md"), "mine");

    const archived = archiveDocFiles("Song");
    expect(archived).toEqual([{ kind: "notes", relativePath: path.join("Deleted Projects", "Song 2.md") }]);
    expect(fs.existsSync(path.join(notes, "Song.md"))).toBe(false);

    expect(restoreArchivedDoc(project("Song"), archived[0])).toBe("restored");
    expect(fs.readFileSync(path.join(notes, "Song.md"), "utf8")).toBe("mine");
  });

  it("原位置已被占用时不覆盖，保留归档", () => {
    fs.writeFileSync(path.join(notes, "Song.md"), "mine");
    const [doc] = archiveDocFiles("Song");
    fs.writeFileSync(path.join(notes, "Song.md"), "new project");

    expect(restoreArchivedDoc(project("Song"), doc)).toBe("conflict");
    expect(fs.readFileSync(path.join(notes, "Song.md"), "utf8")).toBe("new project");
    expect(fs.existsSync(path.join(notes, doc.relativePath))).toBe(true);
  });
});

describe("笔记撞名检测", () => {
  afterEach(() => setKnownProjectTitles([]));

  it("正主（原名即文件名）照常读写，经替换后撞上的项目被拦下", () => {
    fs.writeFileSync(path.join(notes, "Song？A.md"), "theirs");
    setKnownProjectTitles(["Song?A", "Song？A", "Other"]);

    expect(docSharedWith("Song？A", "notes")).toEqual([]);
    expect(readDocFile(project("Song？A"), "notes")).toBe("theirs");

    expect(docSharedWith("Song?A", "notes")).toEqual(["Song？A"]);
    expect(docSharedWith("Other", "notes")).toEqual([]);
    expect(readDocFile(project("Song?A"), "notes")).toBe("");
    expect(() => writeDocBody(project("Song?A"), "notes", "mine")).toThrow(DocSharedError);
    expect(fs.readFileSync(path.join(notes, "Song？A.md"), "utf8")).toBe("theirs");
  });

  it("没有正主时（双方都经替换才撞上）两边都拦", () => {
    setKnownProjectTitles(["A?#", "A？#"]);
    expect(docSharedWith("A?#", "notes")).toEqual(["A？#"]);
    expect(docSharedWith("A？#", "notes")).toEqual(["A?#"]);
  });

  it("正主在 Finder 里被删除后，归档带走它自己的笔记", () => {
    fs.writeFileSync(path.join(notes, "Song？A.md"), "owner");
    setKnownProjectTitles(["Song?A"]); // Song？A 已删除，只剩经替换撞上的 Song?A

    expect(archiveDocFiles("Song？A")).toEqual([
      { kind: "notes", relativePath: path.join("Deleted Projects", "Song？A.md") },
    ]);
    expect(fs.existsSync(path.join(notes, "Song？A.md"))).toBe(false);
  });

  it("Finder 删除其中一个后，归档不会搬走另一个项目的笔记", () => {
    fs.writeFileSync(path.join(notes, "Song？A.md"), "theirs");
    setKnownProjectTitles(["Song？A"]); // Song?A 已在 Finder 里删除，不在当前列表里

    expect(archiveDocFiles("Song?A")).toEqual([]);
    expect(fs.readFileSync(path.join(notes, "Song？A.md"), "utf8")).toBe("theirs");
  });

  it("Finder 改名其中一个后，改名迁移不会搬走另一个项目的笔记", () => {
    fs.writeFileSync(path.join(notes, "Song？A.md"), "theirs");
    setKnownProjectTitles(["Song？A", "X"]); // Song?A 已在 Finder 里改名为 X

    expect(renameDocFiles("Song?A", "X").conflicts).toEqual(["notes"]);
    expect(fs.readFileSync(path.join(notes, "Song？A.md"), "utf8")).toBe("theirs");
    expect(fs.existsSync(path.join(notes, "X.md"))).toBe(false);
  });

  it("不区分大小写的卷上，Song 与 song 视为同一个文件", () => {
    // CI 与本机的临时目录都在不区分大小写的 APFS 上；区分大小写的分支需要专门格式化的卷，这里无法覆盖。
    expect(docFolderIsCaseSensitive("notes")).toBe(false);
    setKnownProjectTitles(["Song", "song"]);
    expect(docSharedWith("Song", "notes")).toEqual(["song"]);
  });

  it("改名预检：改成会撞名的名字时报出对方", () => {
    setKnownProjectTitles(["Song？A", "Mine"]);
    expect(docNameTakenBy("Song?A", "Mine")).toEqual(["Song？A"]);
    expect(docNameTakenBy("Fresh", "Mine")).toEqual([]);
  });
});

describe("还原状态", () => {
  it("文档文件夹暂时不可用时返回 unavailable（值得重试）", () => {
    fs.writeFileSync(path.join(notes, "Song.md"), "mine");
    const [doc] = archiveDocFiles("Song");
    __setPreferences({ notesFolder: path.join(notes, "unplugged") });
    expect(restoreArchivedDoc(project("Song"), doc)).toBe("unavailable");
  });

  it("文件夹在、归档文件被删了时返回 gone", () => {
    fs.writeFileSync(path.join(notes, "Song.md"), "mine");
    const [doc] = archiveDocFiles("Song");
    fs.rmSync(path.join(notes, doc.relativePath));
    expect(restoreArchivedDoc(project("Song"), doc)).toBe("gone");
  });
});

describe("设置被清空", () => {
  it("之前用过的文件夹已消失：仍判定失效，不写进项目文件夹", () => {
    const vault = path.join(notes, "vault");
    fs.mkdirSync(vault);
    __setPreferences({ notesFolder: vault });
    docFilePath(project("Song"), "notes"); // 用过一次，记住 vault

    fs.renameSync(vault, path.join(notes, "vault-renamed"));
    __setPreferences({ notesFolder: "" });

    expect(() => ensureDocFile(project("Song"), "notes")).toThrow(DocFolderMissingError);
    expect(fs.existsSync("/p/Notes.md")).toBe(false);
  });

  it("旧文件夹还在：视为主动改回项目文件夹", () => {
    docFilePath(project("Song"), "notes"); // 记住 notes
    __setPreferences({ notesFolder: "" });
    expect(docFilePath(project("Song"), "notes")).toBe("/p/Notes.md");
  });
});

describe("笔记文件夹失效", () => {
  it("拒绝写入，也不在旧路径上重建文件夹", () => {
    const gone = path.join(notes, "gone");
    __setPreferences({ notesFolder: gone });
    expect(() => ensureDocFile(project("Song"), "notes")).toThrow(DocFolderMissingError);
    expect(fs.existsSync(gone)).toBe(false);
  });
});