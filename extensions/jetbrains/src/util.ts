import { Application, getApplications, getPreferenceValues, PreferenceValues, showToast, Toast } from "@raycast/api";
import { lstat, readFile, stat } from "fs/promises";
import fg from "fast-glob";
import { basename, dirname, resolve } from "path";
import { parseStringPromise } from "xml2js";
import { homedir } from "os";
import History from "./.history.json";
import Settings from "./.settings.json";
import which from "which";
import { Options } from "fast-glob/out/settings";

export const JetBrainsIcon = "jb.png";

interface prefs {
  bin: PreferenceValues;
  toolsInstall: PreferenceValues;
  fallback: PreferenceValues;
  historic: PreferenceValues;
}

const preferences = getPreferenceValues<prefs>();

export const bin = String(preferences["bin"]).replace("~", homedir());
export const toolsInstall = String(preferences["toolsInstall"]).replace("~", homedir());
export const useUrl = Boolean(preferences["fallback"]);
export const historicProjects = Boolean(preferences["historic"]);
const ICON_GLOB = resolve(homedir(), "Applications/JetBrains Toolbox/*/Contents/Resources/icon.icns");
const HISTORY_GLOB = resolve(toolsInstall, "apps/**/.history.json");
const APP_GLOB = resolve(toolsInstall, "apps/**/*.app");
const SETTINGS_GLOB = resolve(toolsInstall, ".settings.json");

const getAppFromPathAndBuild = (path: string, build: string, apps: file[]): file | undefined => {
  return apps.find((app) => dirname(app.path).startsWith(dirname(path)) && dirname(app.path).includes(build));
};

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
  appName: string;
  exists?: boolean;
  filter?: number;
}

export interface AppHistory {
  title: string;
  name: string;
  id: string;
  version: string;
  url: string | false;
  tool: string | false;
  toolName: string | false;
  app: file | undefined;
  build: string;
  icon: string;
  xmlFiles: file[];
  entries?: recentEntry[];
}

export function getFiles(dir: string | string[], options?: Options): Promise<Array<file>> {
  return fg(dir, options).then(
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
                  appName: app.title,
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
    .catch((err) => {
      showToast(Toast.Style.Failure, `Recent project lookup for "${app.title}" failed with error: \n\n ${err}`);
      return [];
    })
    .then(async (entries) => await Promise.all(entries));
}

export const loadAppEntries = async (apps: AppHistory[]): Promise<AppHistory[]> => {
  return await Promise.all(
    apps.map(async (app) => {
      const xmlFiles = app.xmlFiles ?? [];
      for (const res of historicProjects ? xmlFiles : xmlFiles.slice(0, 1)) {
        const entries = await getRecentEntries(res, app);
        // sort before unique so we get the newest versions
        app.entries = createUniqueArray<recentEntry>("path", [...(app.entries ?? []), ...entries]).sort(
          (a, b) => b.opened - a.opened
        );
      }
      return app;
    })
  );
};

export const getRecent = async (path: string | string[], icon: string): Promise<file[]> => {
  return (await getFiles(path))
    .map((file) => ({
      ...file,
      title: file.title,
      icon: icon,
    }))
    .sort((a, b) => b.lastModifiedAt.getTime() - a.lastModifiedAt.getTime());
};

export const getJetBrainsToolboxApp = async (): Promise<Application | undefined> => {
  return (await getApplications()).find((app) => app.name.match("JetBrains Toolbox"));
};

const globFromHistory = (history: History) => {
  if (history.item.intellij_platform === undefined) {
    return [];
  }
  const root = dirname(
    history.item.intellij_platform.default_config_directories["idea.config.path"].replace("$HOME", homedir())
  );
  return history.item.intellij_platform.config.map(
    (config) => `${root}/${config.directory}/options/${config.recent_projects_filename}`
  );
};

const getReadFile = async (filePath: string) => {
  try {
    return String(await readFile(filePath));
  } catch (err) {
    showToast(Toast.Style.Failure, `Read file for ${filePath} failed with error \n\n ${err}`).catch(() =>
      console.log(err)
    );
    return null;
  }
};

const getReadHistoryFile = async (filePath: string) => {
  try {
    return JSON.parse((await getReadFile(filePath)) ?? "{}");
  } catch (err) {
    showToast(Toast.Style.Failure, `History lookup for ${filePath} failed with error \n\n ${err}`).catch(() =>
      console.log(err)
    );
    return {};
  }
};

export const getSettings = async (): Promise<Settings | undefined> => {
  const settingsFile = (await getFiles(SETTINGS_GLOB)).find((file) => file.path);
  if (settingsFile?.path === undefined) {
    return undefined;
  }
  return (await getReadHistoryFile(settingsFile.path)) as Settings;
};

export const getHistory = async (): Promise<AppHistory[]> => {
  const icons = await getIcons();
  const apps = await getFiles(APP_GLOB, { deep: 5, onlyDirectories: true });
  const scriptDir = (await getSettings())?.shell_scripts.location ?? bin;
  return (
    await Promise.all(
      (
        await getFiles(HISTORY_GLOB)
      )
        .filter((file) => !file.path.includes("self/.history.json"))
        .map(async (file) => {
          const historyFile = await getReadHistoryFile(file.path);
          if (!historyFile.history?.length) {
            return null;
          }
          const shellLinkTool = await getReadFile(file.path.replace("history.json", "shellLink"));
          const history: History = historyFile.history
            .sort((history1: History, history2: History) => Number(history1.item.build) - Number(history2.item.build))
            .pop() as History;
          const icon = icons.find((icon) => icon.title.startsWith(history.item.name))?.path ?? JetBrainsIcon;
          const tool = shellLinkTool ?? history.item.intellij_platform?.shell_script_name ?? false;
          const activation = history.item.activation?.hosts[0] ?? false;
          return {
            title: `${history.item.name} ${history.item.version}`,
            name: history.item.name,
            id: history.item.id,
            version: history.item.version,
            build: history.item.build,
            url: useUrl && activation ? `jetbrains://${activation}/navigate/reference?project=` : false,
            tool: tool ? await which(tool, { path: scriptDir }).catch(() => false) : false,
            toolName: tool ? tool : false,
            app: getAppFromPathAndBuild(file.path, history.item.build, apps),
            icon,
            xmlFiles: await getRecent(globFromHistory(history), icon),
          } as AppHistory;
        })
    )
  ).filter((entry): entry is AppHistory => Boolean(entry));
};

export const getIcons = async (): Promise<file[]> => {
  return (await getFiles(ICON_GLOB)).map((icon) => {
    return {
      ...icon,
      title: icon.path.split("/").find((path) => path.match(/.+\.app/)) || icon.title,
      icon: icon.path,
    };
  });
};
