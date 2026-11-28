import fs from "node:fs";
import path from "node:path";
import type { ProjectKind } from "@/daws";

/** 两个路径是否指向同一个条目：只改大小写时，在不区分大小写的卷上为 true。 */
export function isSameEntry(a: string, b: string): boolean {
  try {
    const sa = fs.statSync(a);
    const sb = fs.statSync(b);
    return sa.ino === sb.ino && sa.dev === sb.dev;
  } catch {
    return false;
  }
}

/** 改名 / 复制前查两种入口名：包和文件夹换算出同一个 id 时，两个项目会共用元数据，列表里只剩一个。
 *  返回被占用的路径；没有占用时返回 null。isSelf 用来放过项目自己（只改大小写）。 */
export function entryNameConflict(
  dir: string,
  name: string,
  entryNameFor: (title: string, kind: ProjectKind) => string,
  exists: (target: string) => boolean,
  isSelf: (target: string) => boolean,
): string | null {
  for (const kind of ["package", "folder"] as const) {
    const target = path.join(dir, entryNameFor(name, kind));
    if (exists(target) && !isSelf(target)) return target;
  }
  return null;
}
