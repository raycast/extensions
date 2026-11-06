import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { promisify } from "node:util";
import {
  Clipboard,
  environment,
  getFrontmostApplication,
  getPreferenceValues,
  getSelectedFinderItems,
  showToast,
  Toast,
} from "@raycast/api";
import {
  DEFAULT_OTTY_CLI_PATH,
  buildOpenDirectoryArgs,
  buildFinderDirectoryScriptArgs,
  buildOpenDirectoryTabArgs,
  buildRunCommandArgs,
  buildJumpListArgs,
  buildSshCommandArgs,
  buildViewFileArgs,
  type JumpEntry,
} from "./otty-core";
import { mapConcurrent } from "./concurrency";
import { classifyPaths } from "./paths";
import { buildThemeCatalog, parseTheme, themePreviewSvg, type Theme, type ThemeListEntry } from "./themes";
import {
  buildConfigGetArgs,
  parseConfigReference,
  parseCustomizedKeys,
  settingType,
  toKebabKey,
  type Setting,
  type SettingDoc,
} from "./settings";
import {
  buildCaptureArgs,
  basename,
  buildListArgs,
  countOf,
  buildSections,
  parseOttyJson,
  type OttyPane,
  type OttyTab,
  type OttyWindow,
  type Section,
  type ViewMode,
} from "./workspace";

const execFileAsync = promisify(execFile);

const FINDER_BUNDLE_ID = "com.apple.finder";
const PREVIEW_LINES = 40;
const JUMP_LIMIT = 200;

export function getConfiguredCliPath(): string {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.ottyCliPath.trim() || DEFAULT_OTTY_CLI_PATH;
}

/** The configured CLI path does not point at an executable. */
export class OttyCliMissingError extends Error {}

/** Otty exits 3 when no running app answers on its control socket. */
export class OttyNotRunningError extends Error {}

export async function assertExecutable(path: string): Promise<void> {
  try {
    await access(path, constants.F_OK | constants.X_OK);
  } catch {
    throw new OttyCliMissingError(
      `Otty CLI not found or not executable at ${path}. Install Otty or update the Otty CLI Path preference.`,
    );
  }
}

/** Why Otty refused, by its documented exit codes. */
function describeExit(code: unknown): string | undefined {
  switch (code) {
    case 4:
      return "That pane, tab, or window no longer exists.";
    case 7:
      return "Otty refused the input. Enable “Allow Send Keys” in Otty ▸ Settings ▸ Agents ▸ Skills; SSH and sudo panes also need “Allow Sensitive Sessions”.";
    default:
      return undefined;
  }
}

/** Run the CLI and return its stdout. */
export async function readOtty(args: string[]): Promise<string> {
  const cliPath = getConfiguredCliPath();
  await assertExecutable(cliPath);
  try {
    const { stdout } = await execFileAsync(cliPath, args);
    return stdout;
  } catch (error) {
    const code = (error as { code?: unknown }).code;
    if (code === 3) throw new OttyNotRunningError("Otty isn't running.");
    const reason = describeExit(code);
    if (reason) throw new Error(reason);
    // Otty explains most failures on stderr ("error: parse error: …").
    const stderr = String((error as { stderr?: unknown }).stderr ?? "").trim();
    throw stderr ? new Error(stderr.replace(/^error:\s*/, "")) : error;
  }
}

export async function runOtty(args: string[]): Promise<void> {
  await readOtty(args);
}

export async function runOttyJson<T>(args: string[]): Promise<T> {
  return parseOttyJson<T>(await readOtty(args));
}

export type Workspace = {
  windows: OttyWindow[];
  tabs: OttyTab[];
  panes: OttyPane[];
};

export async function loadWorkspace(): Promise<Workspace> {
  const [windows, tabs, panes] = await Promise.all([
    runOttyJson<OttyWindow[]>(buildListArgs("window")),
    runOttyJson<OttyTab[]>(buildListArgs("tab")),
    runOttyJson<OttyPane[]>(buildListArgs("pane")),
  ]);
  return { windows, tabs, panes };
}

export function sectionsFor(mode: ViewMode, workspace: Workspace): Section[] {
  return buildSections(mode, workspace.windows, workspace.tabs, workspace.panes, homedir());
}

export async function capturePane(paneId: string): Promise<string> {
  return readOtty(buildCaptureArgs(paneId, PREVIEW_LINES));
}

type ConfigShow = {
  config: Record<string, unknown>;
  path: string;
  /** Kebab-case keys that config.local.toml sets; `config set` writes those there. */
  local_keys?: string[];
};

/**
 * Every setting `config get` can read back. `config show` also reports computed
 * and structured keys (`isDarkAppearance`, `keybinds`, `ui-*` colors) that
 * `config get`/`set` reject, so each key is checked and those are dropped.
 */
export async function loadSettings(): Promise<Setting[]> {
  const { config, path, local_keys } = await runOttyJson<ConfigShow>(["config", "show", "--json"]);
  // Customized means set in either layer: config.toml or config.local.toml.
  const customized = new Set([
    ...parseCustomizedKeys(await readFile(path, "utf8").catch(() => "")),
    ...(local_keys ?? []),
  ]);
  // A dozen concurrent `config get` calls; each takes a few milliseconds.
  const settings = await mapConcurrent(
    Object.entries(config),
    12,
    async ([camelKey, value]): Promise<Setting | undefined> => {
      const key = toKebabKey(camelKey);
      const text = await readOtty(buildConfigGetArgs(key)).catch(() => undefined);
      if (text === undefined) return undefined;
      return {
        key,
        value,
        type: settingType(value),
        text: text.replace(/\n$/, ""),
        customized: customized.has(key),
      };
    },
  );
  return settings.filter((setting): setting is Setting => Boolean(setting));
}

export const CONFIG_REFERENCE_URL = "https://docs.otty.sh/reference/configuration";

/**
 * Descriptions, defaults, and allowed values from Otty's online configuration
 * reference, keyed by setting. A plain object, since the cache stores JSON.
 */
export async function loadConfigDocs(): Promise<Record<string, SettingDoc>> {
  const response = await fetch(CONFIG_REFERENCE_URL, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`Configuration reference returned ${response.status}`);
  }
  const docs = parseConfigReference(await response.text());
  if (docs.size === 0) {
    throw new Error("Configuration reference had no settings table");
  }
  return Object.fromEntries(docs);
}

export async function getConfigPath(): Promise<string> {
  return (await readOtty(["config", "path"])).trim();
}

/** Apply a config change, then reload it into the running app if there is one. */
export async function changeSetting(args: string[]): Promise<void> {
  await runOtty(args);
  await runOtty(["config", "reload"]).catch((error) => {
    if (!(error instanceof OttyNotRunningError)) throw error;
  });
}

export type ThemeChoice = Theme & { previewPath?: string };

export type ThemeState = {
  themes: ThemeChoice[];
  light: string;
  dark: string;
  autoDarkMode: boolean;
};

/**
 * Every theme Otty offers, with a preview image for each one whose colors are
 * on disk, plus the current light and dark choices.
 */
export async function loadThemeState(): Promise<ThemeState> {
  const configPath = await getConfigPath();
  const themesDir = join(dirname(configPath), "themes");
  const [list, fileNames, light, dark, autoDark] = await Promise.all([
    runOttyJson<ThemeListEntry[]>(["theme", "list", "--json"]),
    readdir(themesDir).catch(() => [] as string[]),
    readOtty(buildConfigGetArgs("theme")),
    readOtty(buildConfigGetArgs("theme-dark")),
    readOtty(buildConfigGetArgs("auto-theme-dark-mode")),
  ]);
  const files = (
    await Promise.all(
      fileNames
        .filter((name) => name.endsWith(".ottytheme"))
        .map((name) =>
          readFile(join(themesDir, name), "utf8")
            .then(parseTheme)
            .catch(() => undefined),
        ),
    )
  ).filter((theme): theme is Theme => Boolean(theme));

  const previewDir = join(environment.supportPath, "theme-previews");
  await mkdir(previewDir, { recursive: true });
  const themes = await Promise.all(
    buildThemeCatalog(list, files).map(async (theme): Promise<ThemeChoice> => {
      if (!theme.colors) return theme;
      const previewPath = join(
        previewDir,
        // The hash keeps names that slug alike ("My Theme", "My-Theme") apart.
        `${theme.name.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase()}-${createHash("sha1").update(theme.name).digest("hex").slice(0, 8)}.svg`,
      );
      await writeFile(previewPath, themePreviewSvg(theme.colors));
      return { ...theme, previewPath };
    }),
  );

  return {
    themes,
    light: light.trim(),
    dark: dark.trim(),
    autoDarkMode: autoDark.trim() === "true",
  };
}

export async function loadJumpEntries(): Promise<JumpEntry[]> {
  const data = await runOttyJson<{ entries: JumpEntry[] }>(buildJumpListArgs(JUMP_LIMIT));
  return data.entries;
}

export async function showFailure(title: string, error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  await showToast({
    style: Toast.Style.Failure,
    title,
    message: errorMessage,
    primaryAction: {
      title: "Copy Error",
      onAction: async () => {
        await Clipboard.copy(errorMessage);
      },
    },
  });
}

export async function runOttyCommand(label: string, args: string[]): Promise<void> {
  try {
    await runOtty(args);
    await showToast({ style: Toast.Style.Success, title: label });
  } catch (error) {
    await showFailure(`${label} failed`, error);
  }
}

/**
 * Open what is selected in Finder: each folder in a new tab, each file in Otty's
 * viewer. With nothing selected, open the front Finder window's folder, but only
 * when Finder is the app the user was in.
 */
export async function openOtty(): Promise<void> {
  try {
    const selected = await getSelectedFinderItems().catch(() => []);
    const selection = await classifyPaths(selected.map((item) => item.path));
    const { files } = selection;
    let { directories } = selection;

    if (directories.length === 0 && files.length === 0) {
      const app = await getFrontmostApplication().catch(() => undefined);
      if (app?.bundleId !== FINDER_BUNDLE_ID) {
        throw new Error("Select a folder or file in Finder, then try again.");
      }
      const { stdout } = await execFileAsync("/usr/bin/osascript", buildFinderDirectoryScriptArgs());
      directories = [stdout.trim()].filter(Boolean);
      if (directories.length === 0) {
        throw new Error("Finder did not return a folder.");
      }
    }

    let opened: "tab" | "window" = "tab";
    for (const directory of directories) {
      opened = await openInTab(directory);
    }
    for (const file of files) {
      await runOtty(buildViewFileArgs(file));
    }

    const only = [...directories, ...files];
    await showToast({
      style: Toast.Style.Success,
      title:
        only.length === 1
          ? `Opened ${basename(only[0])} in new Otty ${files.length ? "tab" : opened}`
          : `Opened ${countOf(only.length, "item")} in Otty`,
    });
  } catch (error) {
    await showFailure("Could not open in Otty", error);
  }
}

/** Open a directory in a new tab, or a new window when no running Otty takes tabs. */
export async function openInTab(directory: string): Promise<"tab" | "window"> {
  try {
    await runOtty(buildOpenDirectoryTabArgs(directory));
    return "tab";
  } catch {
    await runOtty(buildOpenDirectoryArgs(directory));
    return "window";
  }
}

export async function openNewWindow(): Promise<void> {
  await runOttyCommand("Opened new Otty window", ["open"]);
}

export async function openNewTab(): Promise<void> {
  try {
    await runOtty(["tab", "new"]);
    await showToast({
      style: Toast.Style.Success,
      title: "Opened new Otty tab",
    });
  } catch {
    await runOttyCommand("Opened new Otty window", ["open"]);
  }
}

export async function openDirectory(directory: string): Promise<void> {
  await runOttyCommand("Opened directory in Otty", buildOpenDirectoryArgs(directory));
}

export async function runShellCommand(command: string): Promise<void> {
  await runOttyCommand("Running command in Otty", buildRunCommandArgs(command));
}

export async function openSshTarget(input: string): Promise<void> {
  let args: string[];
  try {
    args = buildSshCommandArgs(input);
  } catch (error) {
    await showFailure("Opening SSH in Otty failed", error);
    return;
  }
  await runOttyCommand("Opening SSH in Otty", args);
}
