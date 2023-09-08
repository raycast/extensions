import {
  Application,
  getApplications,
  getPreferenceValues,
  PreferenceValues,
  showToast,
  Toast,
  environment,
  Image,
} from "@raycast/api";
import { lstat, readFile, stat } from "fs/promises";
import fg from "fast-glob";
import { basename, dirname, resolve } from "path";
import { parseStringPromise } from "xml2js";
import { homedir } from "os";
import History from "./.history.json";
import Settings from "./.settings.json";
import which from "which";
import { Options } from "fast-glob/out/settings";
import Channel, { Extension } from "./.channel.json";
import { exec } from "child_process";
import { promisify } from "util";

export const execPromise = promisify(exec);

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
export const toolsSupportDir = "~/Library/Application Support/JetBrains/Toolbox".replace("~", homedir());
export const useUrl = Boolean(preferences["fallback"]);
export const historicProjects = Boolean(preferences["historic"]);
const ICON_GLOB = resolve(homedir(), "Applications/JetBrains Toolbox/*/Contents/Resources/icon.icns");
const HISTORY_GLOB = resolve(toolsInstall, "apps/**/.history.json");
const CHANNEL_GLOB = resolve(toolsSupportDir, "channels/*.json");
const APP_GLOB = resolve(toolsInstall, "apps/**/*.app");
const SETTINGS_GLOB = resolve(toolsInstall, ".settings.json");

const getAppFromPathAndBuild = (path: string, build: string, apps: file[]): file | undefined => {
  return apps.find((app) => dirname(app.path).startsWith(dirname(path)) && dirname(app.path).includes(build));
};

export interface file {
  title: string;
  icon: Image.ImageLike;
  path: string;
  isDir: boolean;
  lastModifiedAt: Date;
}

export interface recentEntry {
  title: string;
  icon: Image.ImageLike;
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
  app: file | undefined | Application;
  build: string;
  icon: Image.ImageLike;
  xmlFiles: file[];
  entries?: recentEntry[];
}

export interface ToolboxApp extends Application {
  version: string;
  isV2: boolean;
}

function getFile(path: string) {
  return lstat(path).then((stat) => ({
    title: path.split("/").reverse()[0],
    path: path,
    isDir: stat.isDirectory(),
    icon: stat.isDirectory() ? "dir" : "file",
    lastModifiedAt: stat.mtime,
  }));
}

function getFiles(dir: string | string[], options?: Options): Promise<Array<file>> {
  return fg(dir, options).then(async (result) => await Promise.all(result.map(getFile)));
}

const createUniqueArray = <T>(s: string, values: Array<T>): Array<T> => {
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

export const getRecent = async (path: string | string[], icon: Image.ImageLike): Promise<file[]> => {
  return (await getFiles(path))
    .map((file) => ({
      ...file,
      title: file.title,
      icon: icon,
    }))
    .sort((a, b) => b.lastModifiedAt.getTime() - a.lastModifiedAt.getTime());
};

export const getJetBrainsToolboxApp = async (): Promise<ToolboxApp | undefined> => {
  const jb = (await getApplications()).find((app) => app.bundleId === "com.jetbrains.toolbox");
  if (jb === undefined) {
    return jb;
  }
  const version = await execPromise(`defaults read "${jb.path}/Contents/Info.plist" CFBundleShortVersionString`).then(
    ({ stdout }) => stdout.trim()
  );
  return {
    ...jb,
    version,
    isV2: Boolean(version.match(/^2\./)),
  };
};

export const getJetBrainsApp = async (path: string): Promise<Application | undefined> => {
  return (await getApplications()).find((app) => app.path.match(path));
};

export const getJetBrainsAppIcon = async (path: string): Promise<string> => {
  return (await fg(`${path}/Contents/Resources/*.icns`))[0];
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

const globFromChannel = (channel: Channel) => {
  if (channel.tool.toolName === undefined) {
    return [];
  }
  const defaults = (channel.tool?.extensions ?? []).find(
    (extension: Extension) => extension?.defaultConfigDirectories ?? false
  );
  if (defaults?.defaultConfigDirectories === undefined) {
    return ["Space Desktop", "Fleet", "dotTrace"].includes(channel.tool.toolName)
      ? [`${environment.assetsPath}/unsupported.xml`]
      : [`${environment.assetsPath}/missing.xml`];
  }
  const appPath = defaults.defaultConfigDirectories["idea.config.path"].replace("$HOME", homedir());
  return [`${appPath}/options/recent(Projects|Solutions).xml`];
};

const shellFromChannel = (channel: Channel) => {
  if (channel.tool.toolName === undefined) {
    return undefined;
  }
  const defaults = (channel.tool?.extensions ?? []).find((extension: Extension) => extension?.type === "shell");
  return defaults?.baseName;
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

const getReadChannelFile = async (filePath: string) => {
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
  const scriptDir = (await getSettings())?.shell_scripts.location.replace("~", homedir()) ?? bin;
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

export const getV2History = async (): Promise<AppHistory[]> => {
  const scriptDir = (await getSettings())?.shell_scripts.location.replace("~", homedir()) ?? bin;
  return (
    await Promise.all(
      (
        await getFiles(CHANNEL_GLOB)
      ).map(async (file) => {
        const channel = (await getReadChannelFile(file.path)) as Channel;
        if (!channel.channel ?? null) {
          return null;
        }
        const icon = { fileIcon: channel.channel.installationDirectory };
        const shell = shellFromChannel(channel);
        const tool = shell ? await which(shell, { path: scriptDir }).catch(() => false) : false;
        return {
          title: `${channel.tool.toolName} ${channel.tool.versionName}`,
          name: channel.tool.toolName,
          id: channel.tool.toolId,
          version: channel.tool.versionName,
          build: channel.tool.buildNumber,
          url: useUrl && shell ? `jetbrains://${shell}/navigate/reference?project=` : false,
          tool: tool ? tool : false,
          toolName: tool ? tool : false,
          app: await getFile(channel.channel.installationDirectory),
          icon,
          xmlFiles: await getRecent(globFromChannel(channel), icon),
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
