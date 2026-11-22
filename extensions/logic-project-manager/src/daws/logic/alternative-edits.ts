import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { trash } from "@raycast/api";
import type { DawSet } from "@/daws/types";
import { isPlistDict, readPlistFile, type PlistValue } from "./bplist";
import { PACKAGE_EXTENSION } from "./adapter";
import { activeAfterRemoval, alternativeIndex, nameForV2, nextFreeIndex } from "./alternative-rules";

const run = promisify(execFile);
// 系统自带的 plutil：就地修改 plist，保持二进制格式（已在 Logic 上验证）。
const PLUTIL = "/usr/bin/plutil";
const NAME_FIELDS = ["VariantNames", "VariantNamesV2"];

function infoFile(packagePath: string): string {
  return path.join(packagePath, "Resources", "ProjectInformation.plist");
}

function readInfo(packagePath: string): Record<string, PlistValue> {
  const info = readPlistFile(infoFile(packagePath));
  if (!isPlistDict(info)) throw new Error("ProjectInformation.plist is not a dictionary");
  return info;
}

// 文件里实际有的名字字典（老工程可能只有 VariantNames）。
function nameFields(info: Record<string, PlistValue>): string[] {
  const fields = NAME_FIELDS.filter((field) => isPlistDict(info[field]));
  if (fields.length === 0) throw new Error("No alternative names in ProjectInformation.plist");
  return fields;
}

async function plutil(args: string[]): Promise<void> {
  await run(PLUTIL, args);
}

// 两个字典都写：VariantNamesV2 决定显示名，VariantNames 照顾只读它的旧版 Logic。
async function writeName(packagePath: string, index: number, name: string): Promise<void> {
  const projectName = path
    .basename(packagePath)
    .replace(new RegExp(`${PACKAGE_EXTENSION.replace(".", "\\.")}$`, "i"), "");
  for (const field of nameFields(readInfo(packagePath))) {
    const value = field === "VariantNamesV2" ? nameForV2(name, projectName) : name;
    await plutil(["-replace", `${field}.${index}`, "-string", value, infoFile(packagePath)]);
  }
}

export async function setActiveAlternative(packagePath: string, index: number): Promise<void> {
  await plutil(["-replace", "ActiveVariant", "-integer", String(index), infoFile(packagePath)]);
}

export async function renameAlternative(packagePath: string, set: DawSet, name: string): Promise<void> {
  await writeName(packagePath, alternativeIndex(set), name);
}

// 复制整个编号文件夹到最小的空号，再登记名字；登记失败就把刚复制的移到废纸篓，不留半成品。返回新编号。
export async function duplicateAlternative(
  packagePath: string,
  set: DawSet,
  usedIndices: number[],
  name: string,
): Promise<number> {
  const index = nextFreeIndex(usedIndices);
  const target = path.join(packagePath, "Alternatives", String(index).padStart(3, "0"));
  if (fs.existsSync(target)) throw new Error(`${target} already exists`);
  fs.cpSync(path.dirname(set.metadataFile), target, { recursive: true });
  try {
    await writeName(packagePath, index, name);
  } catch (error) {
    await trash(target);
    throw error;
  }
  return index;
}

// 编号文件夹移到废纸篓（iCloud Drive 里不能 mv 出包），再删名字；删的是 Active 的就改成下一个或上一个。
export async function trashAlternative(
  packagePath: string,
  set: DawSet,
  usedIndices: number[],
  isActive: boolean,
): Promise<void> {
  const index = alternativeIndex(set);
  const nextActive = isActive ? activeAfterRemoval(usedIndices, index) : null;
  await trash(path.dirname(set.metadataFile));
  const info = readInfo(packagePath);
  for (const field of nameFields(info)) {
    const names = info[field];
    if (isPlistDict(names) && String(index) in names) {
      await plutil(["-remove", `${field}.${index}`, infoFile(packagePath)]);
    }
  }
  if (nextActive !== null) await setActiveAlternative(packagePath, nextActive);
}
