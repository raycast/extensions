import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { isPlistDict, readPlistFile } from "@/daws/logic/bplist";
import {
  duplicateAlternative,
  renameAlternative,
  setActiveAlternative,
} from "@/daws/logic/alternative-edits";
import type { DawSet } from "@/daws/types";

type Fixture = string | number | boolean | Fixture[] | { [key: string]: Fixture };

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function toXml(value: Fixture): string {
  if (typeof value === "string") return `<string>${escapeXml(value)}</string>`;
  if (typeof value === "boolean") return value ? "<true/>" : "<false/>";
  if (typeof value === "number") return Number.isInteger(value) ? `<integer>${value}</integer>` : `<real>${value}</real>`;
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

function writeAlternative(packagePath: string, index: string) {
  const dir = path.join(packagePath, "Alternatives", index);
  writeBinaryPlist(path.join(dir, "MetaData.plist"), { BeatsPerMinute: 120 });
  fs.writeFileSync(path.join(dir, "ProjectData"), "x");
}

function setFor(packagePath: string, index: string): DawSet {
  return {
    name: index,
    path: packagePath,
    metadataFile: path.join(packagePath, "Alternatives", index, "MetaData.plist"),
    createdAt: 0,
    modifiedAt: 0,
  };
}

function readInfo(packagePath: string): Record<string, unknown> {
  const info = readPlistFile(path.join(packagePath, "Resources", "ProjectInformation.plist"));
  if (!isPlistDict(info)) throw new Error("not a dictionary");
  return info;
}

function isBinaryPlist(filePath: string): boolean {
  return fs.readFileSync(filePath).toString("latin1", 0, 8) === "bplist00";
}

let root: string;
let packagePath: string;

beforeAll(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "lpm-alternative-edits-"));
  packagePath = path.join(root, "Demo.logicx");
  writeBinaryPlist(path.join(packagePath, "Resources", "ProjectInformation.plist"), {
    ActiveVariant: 0,
    VariantNames: { 0: "Demo", 1: "Verse" },
    VariantNamesV2: { 0: "{PROJECT_NAME}", 1: "Verse" },
  });
  writeAlternative(packagePath, "000");
  writeAlternative(packagePath, "001");
});

afterAll(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

describe.skipIf(!fs.existsSync("/usr/bin/plutil"))("alternative edits", () => {
  it("setActiveAlternative 改 ActiveVariant，文件仍是二进制", async () => {
    await setActiveAlternative(packagePath, 1);
    expect(readInfo(packagePath).ActiveVariant).toBe(1);
    expect(isBinaryPlist(path.join(packagePath, "Resources", "ProjectInformation.plist"))).toBe(true);
  });

  it("renameAlternative 两个字典都写，V2 用占位符", async () => {
    await renameAlternative(packagePath, setFor(packagePath, "000"), "Demo #2");
    const info = readInfo(packagePath);
    expect(info.VariantNames).toMatchObject({ 0: "Demo #2" });
    expect(info.VariantNamesV2).toMatchObject({ 0: "{PROJECT_NAME} #2" });
  });

  it("duplicateAlternative 复制文件夹、登记名字，文件仍是二进制", async () => {
    const index = await duplicateAlternative(packagePath, setFor(packagePath, "001"), [0, 1], "Verse #1");
    expect(index).toBe(2);
    const target = path.join(packagePath, "Alternatives", "002");
    expect(fs.existsSync(path.join(target, "MetaData.plist"))).toBe(true);
    expect(fs.existsSync(path.join(target, "ProjectData"))).toBe(true);
    const info = readInfo(packagePath);
    expect(info.VariantNames).toMatchObject({ 2: "Verse #1" });
    expect(info.VariantNamesV2).toMatchObject({ 2: "Verse #1" });
    expect(isBinaryPlist(path.join(packagePath, "Resources", "ProjectInformation.plist"))).toBe(true);
  });
});
