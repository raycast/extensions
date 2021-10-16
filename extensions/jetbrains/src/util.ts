import {preferences} from "@raycast/api";
import {lstat} from "fs/promises";
import fg from "fast-glob";
import {basename} from "path";

export const preferredApp = String(preferences["app"].value) ?? String(preferences["app"].default);

export interface file {
  title: string;
  isDir: boolean;
  icon: string;
  lastModifiedAt: Date;
  path: string;
  app?: file;
}

export function getFiles(dir: string): Promise<Array<file>> {
  return fg(dir).then(async (result) => await Promise.all(result.map(
    (path) => lstat(path).then(stat => ({
      title: path.split("/").reverse()[0],
      path: path,
      isDir: stat.isDirectory(),
      icon: stat.isDirectory() ? 'dir' : 'file',
      lastModifiedAt: stat.mtime,
    }))
  )))
}

export function listAnd(entries: IterableIterator<string> | Array<string>): string {
  const arr = Array.from(entries);
  const last = arr.pop();
  return last ? `${arr.join(", ")} and ${last}` : "";
}

const rightTools = new Map<string, file>();
const wrongTools = new Map<string, Array<file>>();

export function getRightTool(tools: Array<file>, app: string): file {
  if (!rightTools.has(app)) {
    rightTools.set(app, tools.find((tool) => app.match(new RegExp(basename(tool.path), "i"))) ?? tools[0]);
  }
  return rightTools.get(app) ?? tools[0];
}

export function getOtherTools(tools: Array<file>, app: string, rightTool: file): Array<file> {
  if (!wrongTools.has(app)) {
    wrongTools.set(
      app,
      tools.filter((tool) => tool.title !== rightTool.title)
    );
  }
  return wrongTools.get(app) ?? tools;
}

export const createUniqueArray = <T>(s: string, values: Array<T>): Array<T> => {
  if (values.length == 0) {
    return values;
  }
  const check = (values[0] as Record<string, unknown>)[s];
  if (typeof check !== "string") {
    throw new Error("Not a string type");
  }
  const set = new Set<string>();
  return values.reduce((arr: Array<T>, next) => {
    const check = String((next as Record<string, unknown>)[s]);
    if (!set.has(check)) {
      set.add(check);
      return [...arr, next];
    }
    return arr;
  }, [] as Array<T>);
};
