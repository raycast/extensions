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
import { lstat, readFile, readdir, stat, writeFile } from "fs/promises";
import fg from "fast-glob";
import { basename, dirname, resolve } from "node:path";
import { parseStringPromise } from "xml2js";
import { homedir } from "node:os";
import JetBrainsToolboxSettings from "./.settings.json";
import which from "which";
import { Options } from "fast-glob/out/settings";
import Channel, { ChannelDetail, Extension, Tool } from "./.channel.json";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { getGitBranch } from "./git";

export const execPromise = promisify(exec);

export const JetBrainsIcon = "jb.png";

export const isWin = process.platform === "win32";

interface prefs {
  bin: PreferenceValues;
  toolsInstall: PreferenceValues;
  fallback: PreferenceValues;
  frecencySorting: PreferenceValues;
  showGitBranch: PreferenceValues;
}

const preferences = getPreferenceValues<prefs>();
const removePathRegex = /.*[/\\](.+-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}).*/;
export const supportedMajorVersions = ["2", "3"];
export const githubIssueUrl =
  "https://github.com/raycast/extensions/issues/new?body=%3C!--%0APlease%20update%20the%20title%20above%20to%20consisely%20describe%20the%20issue%0A--%3E%0A%0A%23%23%23%20Extension%0A%0Ahttps://www.raycast.com/gdsmith/jetbrains%0A%0A%23%23%23%20Description%0A%0A%3C!--%0APlease%20provide%20a%20clear%20and%20concise%20description%20of%20what%20the%20bug%20is.%20Include%0Ascreenshots%20if%20needed.%20Please%20test%20using%20the%20latest%20version%20of%20the%20extension,%20Raycast%20and%20API.%0A--%3E%0A%23%23%23%20Steps%20To%20Reproduce%0A%0A%3C!--%0AYour%20bug%20will%20get%20fixed%20much%20faster%20if%20the%20extension%20author%20can%20easily%20reproduce%20it.%20Issues%20without%20reproduction%20steps%20may%20be%20immediately%20closed%20as%20not%20actionable.%0A--%3E%0A%0A1.%20In%20this%20environment...%0A2.%20With%20this%20config...%0A3.%20Run%20%27...%27%0A4.%20See%20error...%0A%0A%23%23%23%20Current%20Behaviour%0A%0A%0A%23%23%23%20Expected%20Behaviour%0A%0A%23%23%23%20Raycast%20version%0AVersion:%201.103.3%0A&title=%5BJetBrains%20Toolbox%20Recent%20Projects%5D%20...&template=extension_bug_report.yml&labels=extension,bug&extension-url=https://www.raycast.com/gdsmith/jetbrains&description";

/**
 * Expand `~`, `$HOME`/`$USER_HOME$` placeholders and Windows `%VAR%`
 * placeholders used by JetBrains Toolbox config files and preferences.
 */
export function expandPath(input: string): string {
  if (!input) {
    return input;
  }
  const home = homedir();
  const localAppData = process.env.LOCALAPPDATA ?? resolve(home, "AppData", "Local");
  const roamingAppData = process.env.APPDATA ?? resolve(home, "AppData", "Roaming");
  return input
    .replace(/^~(?=[/\\]|$)/, home)
    .split("$USER_HOME$")
    .join(home)
    .split("${HOME}")
    .join(home)
    .split("$HOME")
    .join(home)
    .split("%LOCALAPPDATA%")
    .join(localAppData)
    .split("%APPDATA%")
    .join(roamingAppData)
    .split("$LOCALAPPDATA")
    .join(localAppData)
    .split("$APPDATA")
    .join(roamingAppData);
}

function defaultToolboxSupportDir(): string {
  if (isWin) {
    const localAppData = process.env.LOCALAPPDATA ?? resolve(homedir(), "AppData", "Local");
    return resolve(localAppData, "JetBrains", "Toolbox");
  }
  if (process.platform === "darwin") {
    return resolve(homedir(), "Library", "Application Support", "JetBrains", "Toolbox");
  }
  return resolve(homedir(), ".local", "share", "JetBrains", "Toolbox");
}

function defaultScriptsDir(): string {
  if (isWin) {
    return resolve(defaultToolboxSupportDir(), "scripts");
  }
  return "/usr/local/bin";
}

const rawBin = String(preferences["bin"] ?? "");
const rawToolsInstall = String(preferences["toolsInstall"] ?? "");

export const bin =
  rawBin === "" || (isWin && (rawBin === "/usr/local/bin" || rawBin === "~/.local/share/JetBrains/Toolbox/scripts"))
    ? defaultScriptsDir()
    : expandPath(rawBin);
export const toolsInstall = rawToolsInstall === "" ? defaultToolboxSupportDir() : expandPath(rawToolsInstall);
export const toolsSupportDir = defaultToolboxSupportDir();
export const useUrl = Boolean(preferences["fallback"]);
export const frecencySorting = Boolean(preferences["frecencySorting"]);
export const showGitBranch = Boolean(preferences["showGitBranch"]);

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
  branch?: string;
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
  isSupported: boolean;
}

async function getFile(path: string) {
  const stats = await lstat(path);
  return {
    title: basename(path),
    path: path,
    isDir: stats.isDirectory(),
    icon: stats.isDirectory() ? "dir" : "file",
    lastModifiedAt: stats.mtime,
  };
}

async function getFiles(dir: string | string[], options?: Options): Promise<Array<file>> {
  // fast-glob expects forward slashes, even on Windows
  const patterns = (Array.isArray(dir) ? dir : [dir]).map((pattern) => pattern.replace(/\\/g, "/"));
  const glob = await fg(patterns, options);
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
                  (recentOption: xmlJson) => recentOption._attr.name === "projectOpenTimestamp",
                );
                const path = expandPath(recentEntry._attr.key);
                const segments = path.split(/[\\/]/).filter((segment) => segment.length > 0);
                // drop a Windows drive letter (`C:`) so subtitles look the same on every OS
                const displaySegments =
                  segments.length > 0 && /^[A-Za-z]:$/.test(segments[0]) ? segments.slice(1) : segments;
                return {
                  title: basename(path),
                  icon: app.icon ?? JetBrainsIcon,
                  path: path,
                  dirname: dirname(path).replace(homedir(), "~").replace("/Volumes", ""),
                  opened: Number(projectOpenTimestamp?._attr.value || 0),
                  parts: displaySegments.reverse().slice(1).join(" ← "),
                  appName: app.title,
                  app,
                  id: `${path}.${app.title}`,
                  xmlFile,
                };
              },
            )
            // check if the file actually exists to prevent breaking open with actions
            .map(async (recent: recentEntry) => {
              const [exists, branch] = await Promise.all([
                stat(recent.path)
                  .then(() => true)
                  .catch(() => false),
                showGitBranch ? getGitBranch(recent.path) : Promise.resolve(undefined),
              ]);
              return {
                ...recent,
                exists,
                branch,
              } as recentEntry;
            })
        );
      }),
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
      }),
    )
  ).map((app) => ({
    ...app,
    entries: createUniqueArray<recentEntry>(
      "path",
      (app.entries ?? []).sort((a, b) => b.opened - a.opened),
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
  const apps = await getApplications();
  const jb =
    apps.find((app) => app.bundleId === "com.jetbrains.toolbox") ??
    apps.find((app) => app.name.toLowerCase().includes("jetbrains toolbox")) ??
    apps.find((app) => (app.windowsAppId ?? "").toLowerCase().includes("toolbox"));
  if (jb === undefined) {
    return jb;
  }
  if (isWin) {
    // `defaults read` doesn't exist on Windows — read the version from the
    // executable instead and assume support when it can't be determined.
    try {
      const escapedPath = jb.path.replace(/'/g, "''");
      const { stdout } = await execPromise(
        `powershell -NoProfile -NonInteractive -Command "(Get-Item '${escapedPath}').VersionInfo.ProductVersion"`,
      );
      const version = stdout.trim().split("\n").pop()?.trim() ?? "";
      if (version !== "") {
        return {
          ...jb,
          version,
          isSupported: supportedMajorVersions.some((prefix) => version === prefix || version.startsWith(prefix + ".")),
        };
      }
    } catch (err) {
      captureException(err);
    }
    return {
      ...jb,
      version: "unknown",
      isSupported: true,
    };
  }
  const version = await execPromise(`defaults read "${jb.path}/Contents/Info.plist" CFBundleShortVersionString`).then(
    ({ stdout }) => stdout.trim(),
  );
  return {
    ...jb,
    version,
    isSupported: supportedMajorVersions.some((prefix) => version === prefix || version.startsWith(prefix + ".")),
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
      (extension: Extension) => extension?.defaultConfigDirectories ?? false,
    );
    if (defaults?.defaultConfigDirectories === undefined) {
      return ["Space Desktop", "Fleet", "dotTrace"].includes(tool.toolName)
        ? [`${environment.assetsPath}/unsupported.xml`]
        : [`${environment.assetsPath}/missing.xml`];
    }
    const appPath = expandPath(defaults.defaultConfigDirectories["idea.config.path"]);
    return [`${appPath}/options/recent(Projects|Solutions).xml`];
  }
  const expandedPatterns = directoryPatterns.map((pattern) => expandPath(pattern));
  // Recent projects live in the IDE config directory. Caches/logs/plugins
  // directories never contain them, so skip those globs on every OS instead
  // of filtering for the macOS-only "Application Support" segment.
  const configPatterns = expandedPatterns.filter((pattern) => !/caches?|logs?|plugins/i.test(pattern));
  return (configPatterns.length > 0 ? configPatterns : expandedPatterns).reduce<string[]>(
    (previousValue, currentValue: string) => {
      return [...previousValue, ...recentProjectsFilenames.map((filename) => `${currentValue}/*/${filename}`)];
    },
    [] as string[],
  );
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
      captureException(err),
    );
    return null;
  }
};

const getReadJsonFile = async (filePath: string) => {
  try {
    return JSON.parse((await getReadFile(filePath)) ?? "{}");
  } catch (err) {
    showToast(Toast.Style.Failure, `History lookup for ${filePath} failed with error \n\n ${err}`).catch(() =>
      captureException(err),
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
      captureException(err),
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
      captureException(err),
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
          },
    ),
  );

export const addFav = async (path: string, appId: string): Promise<void> => {
  const settingsFile = (await getFiles(SETTINGS_GLOB)).find((file) => file.path);
  if (settingsFile?.path === undefined) {
    return undefined;
  }
  const contents = (await getReadJsonFile(settingsFile.path)) as JetBrainsToolboxSettings;
  const project = contents.projects?.[path] ?? {};
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
  const project = contents.projects?.[path] ?? {};
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
  const project = projects?.[path];
  if (projects && project !== undefined) {
    if (project["favorite"]) delete project["favorite"];
    if (project["launchMethod"]) delete project["launchMethod"];
    if (Object.keys(project).length === 0) {
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
  const settingsLocation = (await getSettings())?.shell_scripts?.location;
  const scriptDir = settingsLocation ? expandPath(settingsLocation) : bin;
  return (
    await Promise.all(
      (await getChannels()).map(async (channelContent) => {
        const { channel, tool: tool, channelId } = channelContent ?? {};
        if (channel === undefined || tool === undefined) {
          return null;
        }
        const installationDirectory = expandPath(channel.installationDirectory);
        const icon = { fileIcon: installationDirectory };
        const shell = shellFromChannel(tool);
        // `which` resolves Windows PATHEXT (`.cmd`/`.exe`) automatically, but
        // fall back to an explicit `.cmd` lookup for Toolbox shell scripts.
        const whichTool = shell
          ? await which(shell, { path: scriptDir }).catch(() =>
              isWin ? which(`${shell}.cmd`, { path: scriptDir }).catch(() => false) : false,
            )
          : false;
        return {
          title: `${tool.toolName} ${tool.versionName}`,
          name: tool.toolName,
          id: tool.toolId,
          version: tool.versionName,
          build: tool.buildNumber,
          url: useUrl && shell ? `jetbrains://${shell}/navigate/reference?project=` : false,
          tool: whichTool ? whichTool : false,
          toolName: shell ? shell : false,
          app: await getFile(installationDirectory).catch(() => undefined),
          icon,
          xmlFiles: (await getRecent(await globFromChannel(tool, channel), icon)).sort(
            (a, b) => b.lastModifiedAt.getTime() - a.lastModifiedAt.getTime(),
          ),
          channelId,
        } as AppHistory;
      }),
    )
  ).filter((entry): entry is AppHistory => Boolean(entry));
};

export function nameFromId(id: string): string {
  return id.substring(0, id.length - 37);
}

/**
 * Resolve the executable used to launch an IDE.
 *
 * On macOS the installation directory is an app bundle that can be opened
 * directly. On Windows it is a plain folder (with the launcher in `bin/`),
 * so locate `<shell>64.exe` (e.g. `idea64.exe`) inside it — opening the
 * folder itself would just show it in File Explorer.
 */
export async function resolveLaunchTarget(
  appPath: string | undefined,
  shellName: string | false | undefined,
): Promise<string> {
  if (!appPath) {
    return "";
  }
  if (!isWin) {
    return appPath;
  }
  try {
    if (!(await stat(appPath)).isDirectory()) {
      return appPath;
    }
    const exes = (await readdir(resolve(appPath, "bin")))
      .filter((entry) => entry.toLowerCase().endsWith(".exe"))
      .sort();
    if (exes.length === 0) {
      return appPath;
    }
    const preferred =
      typeof shellName === "string" && shellName !== "" ? [`${shellName}64.exe`, `${shellName}.exe`] : [];
    const match =
      preferred
        .map((name) => exes.find((exe) => exe.toLowerCase() === name.toLowerCase()))
        .find((found): found is string => typeof found === "string") ??
      exes.find((exe) => exe.toLowerCase().endsWith("64.exe")) ??
      exes[0];
    if (!match) {
      return appPath;
    }
    return resolve(appPath, "bin", match);
  } catch (err) {
    captureException(err);
    return appPath;
  }
}

export function symbolFromMod(mod: Keyboard.KeyModifier) {
  if (isWin) {
    switch (mod) {
      case "cmd":
      case "ctrl":
        return "Ctrl";
      case "opt":
        return "Alt";
      case "shift":
        return "Shift";
    }
  }
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
