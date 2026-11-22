import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// 类型文件夹（actions / components / hooks / shared）只放两个以上功能共用的东西。
// 一个文件如果只被一个功能文件夹引用、别处都没用到，就应该放进那个功能文件夹。
const TYPE_FOLDERS = ["actions", "components", "hooks", "shared"];
const FEATURES = ["projects", "bounces", "collections", "cleanup"];
const SRC_ROOT = path.resolve(process.cwd(), "src");
const UI_ROOT = path.join(SRC_ROOT, "core/ui");
// 共用代码在两个仓库里放在同一个位置。下面的文件在另一个仓库里还有别处用到，
// 在本仓库看起来只被一个功能用，但不能挪。
// hooks/use-daw-app：LPM 的 src/daws/logic 也用。
const USED_IN_OTHER_REPO = ["hooks/use-daw-app"];


/** 递归列出目录下的 .ts / .tsx 文件。 */
function listSourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

/** 取出文件里所有 import / export 的模块路径。 */
function importedModules(source: string): string[] {
  const modules: string[] = [];
  const pattern = /(?:from|import)\s+"([^"]+)"/g;
  for (const match of source.matchAll(pattern)) modules.push(match[1]);
  return modules;
}

/** 文件所在的功能文件夹；不在功能文件夹里的返回 "other"。 */
function ownerOf(file: string): string {
  const [top] = path.relative(UI_ROOT, file).split(path.sep);
  return FEATURES.includes(top) ? top : "other";
}

/** 相对 src/core/ui 的路径，去掉扩展名和结尾的 /index，例如 "hooks/use-sort-option"。 */
function keyOf(target: string): string | null {
  const rel = path.relative(UI_ROOT, target);
  if (rel.startsWith("..")) return null;
  return rel
    .split(path.sep)
    .join("/")
    .replace(/\.tsx?$/, "")
    .replace(/\/index$/, "");
}

/** 把 import 路径解析成 keyOf 的形式；不指向 src/core/ui 的返回 null。 */
function resolveImport(fromFile: string, modulePath: string): string | null {
  if (modulePath.startsWith("@/")) return keyOf(path.join(SRC_ROOT, modulePath.slice(2)));
  if (modulePath.startsWith(".")) return keyOf(path.resolve(path.dirname(fromFile), modulePath));
  return null;
}

describe("类型文件夹的归属", () => {
  it("只被一个功能引用的文件应该放进那个功能文件夹", () => {
    const users = new Map<string, Set<string>>();
    for (const file of listSourceFiles(SRC_ROOT)) {
      const owner = ownerOf(file);
      for (const modulePath of importedModules(fs.readFileSync(file, "utf8"))) {
        const key = resolveImport(file, modulePath);
        if (key === null) continue;
        const owners = users.get(key) ?? new Set<string>();
        owners.add(owner);
        users.set(key, owners);
      }
    }

    const offenders: string[] = [];
    for (const folder of TYPE_FOLDERS) {
      const dir = path.join(UI_ROOT, folder);
      if (!fs.existsSync(dir)) continue;
      for (const file of listSourceFiles(dir)) {
        const key = keyOf(file);
        if (key === null || USED_IN_OTHER_REPO.includes(key)) continue;
        const owners = users.get(key);
        if (owners?.size !== 1) continue;
        const [only] = [...owners];
        if (only === "other") continue;
        offenders.push(`${path.relative(process.cwd(), file)} 只被 ${only} 用，应放进 src/core/ui/${only}/`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
