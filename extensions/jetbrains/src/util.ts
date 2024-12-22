import {
  Application,
  captureException,
  environment,
  getApplications,
  getPreferenceValues,
  Image,
  Keyboard,
  PreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";
import { lstat, readFile, stat, writeFile } from "fs/promises";
import fg from "fast-glob";
import { basename, dirname, resolve } from "path";
import { parseStringPromise } from "xml2js";
import { homedir } from "os";
import JetBrainsToolboxSettings from "./.settings.json";
import which from "which";
import { Options } from "fast-glob/out/settings";
import Channel, { ChannelDetail, Extension, Tool } from "./.channel.json";
import { exec } from "child_process";
import { promisify } from "util";

export const execPromise = promisify(exec);

export const JetBrainsIcon = "jb.png";

interface prefs {
  bin: PreferenceValues;
  toolsInstall: PreferenceValues;
  fallback: PreferenceValues;
  frecencySorting: PreferenceValues;
}

const preferences = getPreferenceValues<prefs>();
const removePathRegex = /.*\/(.+-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}).*/;

export const bin = String(preferences["bin"]).replace("~", homedir());
export const toolsInstall = String(preferences["toolsInstall"]).replace("~", homedir());
export const toolsSupportDir = "~/Library/Application Support/JetBrains/Toolbox".replace("~", homedir());
export const useUrl = Boolean(preferences["fallback"]);
export const frecencySorting = Boolean(preferences["frecencySorting"]);

const CHANNEL_GLOB = resolve(toolsSupportDir, "channels/*.json");
const SETTINGS_GLOB = resolve(toolsSupportDir, ".settings.json");

export interface file {
  title: string;
  icon: Image.ImageLike;
  path: string;
  isDir: boolean;
  lastModifiedAt: Date;
}

export interface recentEntry {
  id: string;
  title: string;
  icon: Image.ImageLike;
  path: string;
  dirname: string;
  parts: string;
  opened: number;
  appName: string;
  exists?: boolean;
  filter?: number;
  app: AppHistory;
  xmlFile: file;
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
  channelId: string;
}

export interface ToolboxApp extends Application {
  version: string;
  isV2: boolean;
}

async function getFile(path: string) {
  const stats = await lstat(path);
  return {
    title: path.split("/").reverse()[0],
    path: path,
    isDir: stats.isDirectory(),
    icon: stats.isDirectory() ? "dir" : "file",
    lastModifiedAt: stats.mtime,
  };
}

async function getFiles(dir: string | string[], options?: Options): Promise<Array<file>> {
  const glob = await fg(dir, options);
  return Promise.all(glob.map(getFile));
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
    .then((file) =>
      parseStringPromise(file, { attrkey: "_attr" }).then((result) => {
        return (
          ((result.application?.component[0].option[0].map ?? [])[0]?.entry ?? [])
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
                  opened: Number(projectOpenTimestamp?._attr.value) ?? 0,
                  parts: path.substr(1).split("/").reverse().slice(1).join(" ← "),
                  appName: app.title,
                  app,
                  id: `${path}.${app.title}`,
                  xmlFile,
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
      captureException(err);
      showToast(Toast.Style.Failure, `Recent project lookup for "${app.title}" failed with error: \n\n ${err}`);
      return [];
    })
    .then(async (entries) => await Promise.all(entries));
}

export const loadAppEntries = async (apps: AppHistory[]): Promise<AppHistory[]> => {
  return (
    await Promise.all(
      apps.map(async (app) => {
        const xmlFiles = app.xmlFiles ?? [];
        for (const res of xmlFiles) {
          const entries = await getRecentEntries(res, app);
          // sort before unique so we get the newest versions
          app.entries = [...(app.entries ?? []), ...entries];
        }
        return app;
      })
    )
  ).map((app) => ({
    ...app,
    entries: createUniqueArray<recentEntry>(
      "path",
      (app.entries ?? []).sort((a, b) => b.opened - a.opened)
    ),
    // entries: app.entries
  }));
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

const globFromChannel = async (tool: Tool, channel: ChannelDetail) => {
  if (tool.toolName === undefined) {
    return [];
  }
  const build = channel.history?.toolBuilds?.[0] ?? {};
  const directoryPatterns = build?.tool?.intelliJProperties?.directoryPatterns ?? [];
  const recentProjectsFilenames = build?.tool?.intelliJProperties?.recentProjectsFilenames ?? [];
  if (directoryPatterns.length === 0 || recentProjectsFilenames.length === 0) {
    const defaults = (tool?.extensions ?? []).find(
      (extension: Extension) => extension?.defaultConfigDirectories ?? false
    );
    if (defaults?.defaultConfigDirectories === undefined) {
      return ["Space Desktop", "Fleet", "dotTrace"].includes(tool.toolName)
        ? [`${environment.assetsPath}/unsupported.xml`]
        : [`${environment.assetsPath}/missing.xml`];
    }
    const appPath = defaults.defaultConfigDirectories["idea.config.path"].replace("$HOME", homedir());
    return [`${appPath}/options/recent(Projects|Solutions).xml`];
  }
  return directoryPatterns
    .filter((pattern) => pattern.match("Application Support"))
    .reduce<string[]>((previousValue, currentValue: string) => {
      return [
        ...previousValue,
        ...recentProjectsFilenames.map((filename) => `${currentValue.replace("$HOME", homedir())}/*/${filename}`),
      ];
    }, [] as string[]);
};

const shellFromChannel = (tool: Tool) => {
  if (tool.toolName === undefined) {
    return undefined;
  }
  const defaults = (tool.extensions ?? []).find((extension: Extension) => extension?.type === "shell");
  return defaults?.name;
};

const getReadFile = async (filePath: string) => {
  try {
    return String(await readFile(filePath));
  } catch (err) {
    showToast(Toast.Style.Failure, `Read file for ${filePath} failed with error \n\n ${err}`).catch(() =>
      captureException(err)
    );
    return null;
  }
};

const getReadJsonFile = async (filePath: string) => {
  try {
    return JSON.parse((await getReadFile(filePath)) ?? "{}");
  } catch (err) {
    showToast(Toast.Style.Failure, `History lookup for ${filePath} failed with error \n\n ${err}`).catch(() =>
      captureException(err)
    );
    return {};
  }
};

const doWriteFile = async (filePath: string, contents: string) => {
  try {
    if (contents.length !== 0) {
      await writeFile(filePath, contents, {
        flag: "w",
      });
    }
  } catch (err) {
    showToast(Toast.Style.Failure, `Write to ${filePath} failed with error \n\n ${err}`).catch(() =>
      captureException(err)
    );
  }
};
export const replaceInFile = async (filePath: string, regex: RegExp, replace: string) => {
  await doWriteFile(filePath, ((await getReadFile(filePath)) ?? "").replace(regex, replace));
};

const writeSettingsFile = async (filePath: string, settings: JetBrainsToolboxSettings) => {
  try {
    await doWriteFile(filePath, JSON.stringify(settings));
  } catch (err) {
    showToast(Toast.Style.Failure, `Write ${filePath} failed with error \n\n ${err}`).catch(() =>
      captureException(err)
    );
  }
};

export const getSettings = async (): Promise<JetBrainsToolboxSettings | undefined> => {
  const settingsFile = (await getFiles(SETTINGS_GLOB)).find((file) => file.path);
  if (settingsFile?.path === undefined) {
    return undefined;
  }
  return (await getReadJsonFile(settingsFile.path)) as JetBrainsToolboxSettings;
};

export const getChannels = async (): Promise<(Channel | undefined)[]> =>
  Promise.all(
    (await getFiles(CHANNEL_GLOB)).map(async (file) =>
      file?.path === undefined
        ? undefined
        : {
            ...((await getReadJsonFile(file.path)) as Channel),
            channelId: file.path.replace(removePathRegex, "$1"),
          }
    )
  );

export const addFav = async (path: string, appId: string): Promise<void> => {
  const settingsFile = (await getFiles(SETTINGS_GLOB)).find((file) => file.path);
  if (settingsFile?.path === undefined) {
    return undefined;
  }
  const contents = (await getReadJsonFile(settingsFile.path)) as JetBrainsToolboxSettings;
  const project = contents.projects[path] ?? {};
  project.favorite = true;
  project.launchMethod = appId;
  await writeSettingsFile(settingsFile.path, {
    ...contents,
    projects: {
      ...contents.projects,
      [path]: project,
    },
  });
};

export const hideProject = async (path: string): Promise<void> => {
  const settingsFile = (await getFiles(SETTINGS_GLOB)).find((file) => file.path);
  if (settingsFile?.path === undefined) {
    return undefined;
  }
  const contents = (await getReadJsonFile(settingsFile.path)) as JetBrainsToolboxSettings;
  const project = contents.projects[path] ?? {};
  project.hidden = new Date().toISOString();
  await writeSettingsFile(settingsFile.path, {
    ...contents,
    projects: {
      ...contents.projects,
      [path]: project,
    },
  });
};

export const rmFav = async (path: string): Promise<void> => {
  const settingsFile = (await getFiles(SETTINGS_GLOB)).find((file) => file.path);
  if (settingsFile?.path === undefined) {
    return undefined;
  }
  const contents = (await getReadJsonFile(settingsFile.path)) as JetBrainsToolboxSettings;
  const projects = contents.projects;
  if (contents.projects[path] !== undefined) {
    projects[path]["favorite"] && delete projects[path]["favorite"];
    projects[path]["launchMethod"] && delete projects[path]["launchMethod"];
    if (Object.keys(projects[path]).length === 0) {
      delete projects[path];
    }
  }
  await writeSettingsFile(settingsFile.path, {
    ...contents,
    projects,
  });
};

export const setSort = async (sortOrder: string[]): Promise<void> => {
  if (sortOrder.length === 0) {
    return;
  }
  const settingsFile = (await getFiles(SETTINGS_GLOB)).find((file) => file.path);
  if (settingsFile?.path === undefined) {
    return undefined;
  }
  const contents = (await getReadJsonFile(settingsFile.path)) as JetBrainsToolboxSettings;
  await writeSettingsFile(settingsFile.path, {
    ...contents,
    ordering: {
      installed: sortOrder,
    },
  });
};

export const getHistory = async (): Promise<AppHistory[]> => {
  const scriptDir = (await getSettings())?.shell_scripts.location.replace("~", homedir()) ?? bin;
  return (
    await Promise.all(
      (
        await getChannels()
      ).map(async (channelContent) => {
        const { channel, tool: tool, channelId } = channelContent ?? {};
        if (channel === undefined || tool === undefined) {
          return null;
        }
        const icon = { fileIcon: channel.installationDirectory };
        const shell = shellFromChannel(tool);
        const whichTool = shell ? await which(shell, { path: scriptDir }).catch(() => false) : false;
        return {
          title: `${tool.toolName} ${tool.versionName}`,
          name: tool.toolName,
          id: tool.toolId,
          version: tool.versionName,
          build: tool.buildNumber,
          url: useUrl && shell ? `jetbrains://${shell}/navigate/reference?project=` : false,
          tool: whichTool ? whichTool : false,
          toolName: shell ? shell : false,
          app: await getFile(channel.installationDirectory),
          icon,
          xmlFiles: (await getRecent(await globFromChannel(tool, channel), icon)).sort(
            (a, b) => b.lastModifiedAt.getTime() - a.lastModifiedAt.getTime()
          ),
          channelId,
        } as AppHistory;
      })
    )
  ).filter((entry): entry is AppHistory => Boolean(entry));
};

export function nameFromId(id: string): string {
  return id.substring(0, id.length - 37);
}

export function symbolFromMod(mod: Keyboard.KeyModifier) {
  switch (mod) {
    case "cmd":
      return "⌘";
    case "opt":
      return "⌥";
    case "ctrl":
      return "⌃";
    case "shift":
      return "⇧";
  }
}

export function symbolFromChar(char: Keyboard.KeyEquivalent) {
  switch (char) {
    case "delete":
      return "⌫";
    case "backspace":
      return "⌫";
    case "return":
      return "⏎";
    case "enter":
      return "↩︎";
    case "deleteForward":
      return "⌦";
    case "arrowUp":
      return "↑";
    case "arrowDown":
      return "↓";
    case "arrowLeft":
      return "←";
    case "arrowRight":
      return "→";
    case "pageUp":
      return "⇞";
    case "pageDown":
      return "⇟";
    case "home":
      return "↖︎";
    case "end":
      return "↘︎";
    case "escape":
      return "⎋";
    case "space":
      return "␣";
    default:
      return char;
  }
}
