import { preferences } from "@raycast/api";
import { lstat, readFile, stat } from "fs/promises";
import fg from "fast-glob";
import { basename, dirname } from "path";
import { parseStringPromise } from "xml2js";
import { homedir } from "os";

export const JetBrainsIcon = "jb.png";

export const preferredApp = String(preferences["app"].value || preferences["app"].default);
export const bin = String(preferences["bin"].value || preferences["bin"].default).replace("~", homedir());
export const toolsInstall = String(preferences["toolsInstall"].value || preferences["toolsInstall"].default).replace(
  "~",
  homedir()
);
export const useUrl = Boolean(preferences["fallback"].value || preferences["fallback"].default);
export const historicProjects = Boolean(preferences["historic"].value || preferences["historic"].default);

export interface file {
  title: string;
  icon: string;
  path: string;
  isDir: boolean;
  lastModifiedAt: Date;
}

export interface recentEntry {
  title: string;
  icon: string;
  path: string;
  dirname: string;
  parts: string;
  opened: number;
  app: string;
  exists?: boolean;
  filter?: number;
}

export interface AppHistory {
  title: string;
  url: string | false;
  tool: string | false;
  icon: string;
  xmlFiles: file[];
  entries?: recentEntry[];
}

export function getFiles(dir: string | string[]): Promise<Array<file>> {
  return fg(dir).then(
    async (result) =>
      await Promise.all(
        result.map((path) =>
          lstat(path).then((stat) => ({
            title: path.split("/").reverse()[0],
            path: path,
            isDir: stat.isDirectory(),
            icon: stat.isDirectory() ? "dir" : "file",
            lastModifiedAt: stat.mtime,
          }))
        )
      )
  );
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

interface xmlJson {
  _attr: {
    [key: string]: string;
  };
  value: Array<xmlJson>;
  RecentProjectMetaInfo: Array<xmlJson>;
  option: Array<xmlJson>;
}

export async function getRecentEntries(xmlFile: file, app: AppHistory): Promise<Array<recentEntry>> {
  return readFile(xmlFile.path)
    .then((xmlFile) =>
      parseStringPromise(xmlFile, { attrkey: "_attr" }).then((result) => {
        return (
          (result.application.component[0].option[0].map[0].entry ?? [])
            .map(
              // convert xmlJson object to array of recentEntries
              (recentEntry: xmlJson): recentEntry => {
                const projectOpenTimestamp = (recentEntry.value[0].RecentProjectMetaInfo[0].option ?? []).find(
                  (recentOption: xmlJson) => recentOption._attr.name === "projectOpenTimestamp"
                );
                const path = recentEntry._attr.key.replace("$USER_HOME$", homedir());
                return {
                  title: basename(path),
                  icon: app.icon ?? JetBrainsIcon,
                  path: path,
                  dirname: dirname(path).replace(homedir(), "~").replace("/Volumes", ""),
                  opened: Number(projectOpenTimestamp?._attr.value ?? 0),
                  parts: path.substr(1).split("/").reverse().slice(1).join(" ← "),
                  app: app.title,
                };
              }
            )
            // check if the file actually exists to prevent breaking open with actions
            .map(async (recent: recentEntry) => {
              return {
                ...recent,
                exists: await stat(recent.path)
                  .then(() => true)
                  .catch(() => false),
              } as recentEntry;
            })
        );
      })
    )
    .then(async (entries) => await Promise.all(entries));
}

export function sortApps(a: AppHistory, b: AppHistory): number {
  return a.title.toLowerCase().startsWith(preferredApp.toLowerCase())
    ? -1
    : b.title.toLowerCase().startsWith(preferredApp.toLowerCase())
    ? 1
    : 0;
}
