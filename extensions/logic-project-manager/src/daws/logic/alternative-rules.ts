import path from "node:path";
import type { DawSet } from "@/daws/types";
import { PROJECT_NAME_TOKEN } from "./adapter";

// 编号文件夹 Alternatives/NNN 的数字就是 Alternative 的编号。
export function alternativeIndex(set: Pick<DawSet, "metadataFile">): number {
  return Number(path.basename(path.dirname(set.metadataFile)));
}

// 新 Alternative 用最小的空号，和 Logic 新建时一样。
export function nextFreeIndex(used: number[]): number {
  const taken = new Set(used);
  let index = 0;
  while (taken.has(index)) index++;
  return index;
}

// 复制出来的名字：和 Logic 新建时一样叫「原名 #N」，N 取最小的没被占用的；原名已经带 #N 的先去掉。
export function duplicateName(source: string, existing: string[]): string {
  const base = source.replace(/ #\d+$/, "");
  const taken = new Set(existing.map((name) => name.toLowerCase()));
  let n = 1;
  while (taken.has(`${base} #${n}`.toLowerCase())) n++;
  return `${base} #${n}`;
}

// VariantNamesV2 的写法：名字就是项目名，或以「项目名 + 空格」开头时，把项目名换成占位符，项目改名后跟着变。
export function nameForV2(name: string, projectName: string): string {
  if (name === projectName || name.startsWith(`${projectName} `)) {
    return PROJECT_NAME_TOKEN + name.slice(projectName.length);
  }
  return name;
}

// 删掉 Active 的那个之后，新的 Active：按编号的下一个，没有就上一个；一个都不剩时为 null。
export function activeAfterRemoval(indices: number[], removed: number): number | null {
  const rest = indices.filter((index) => index !== removed).sort((a, b) => a - b);
  return rest.find((index) => index > removed) ?? rest.at(-1) ?? null;
}
