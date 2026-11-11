import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DocUnreadableError, readDocFileForEdit } from "../src/core/docs/docs";
import { __setPreferences, environment } from "./mocks/raycast-api";

let notes: string;
const song = { title: "Song", folderPath: "/p/Song" };

beforeEach(() => {
  notes = fs.mkdtempSync(path.join(os.tmpdir(), "apm-notes-"));
  environment.supportPath = fs.mkdtempSync(path.join(os.tmpdir(), "apm-support-"));
  __setPreferences({ notesFolder: notes });
});

afterEach(() => {
  __setPreferences({});
  fs.rmSync(notes, { recursive: true, force: true });
});

describe("编辑前读取笔记", () => {
  it("文件不存在：返回空，可以新建", () => {
    expect(readDocFileForEdit(song, "notes")).toBe("");
  });

  it("文件存在但读不出来：抛 DocUnreadableError，不当成空笔记", () => {
    const file = path.join(notes, "Song.md");
    fs.writeFileSync(file, "mine");
    fs.chmodSync(file, 0o000);
    try {
      expect(() => readDocFileForEdit(song, "notes")).toThrow(DocUnreadableError);
    } finally {
      fs.chmodSync(file, 0o600);
    }
  });
});
