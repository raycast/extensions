import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { environment, showToast, Toast } from "@raycast/api";
import { mapConcurrent } from "./concurrency";
import { OttyNotRunningError, readOtty, runOtty, runOttyJson, showFailure } from "./otty";
import {
  buildConfigGetArgs,
  buildConfigPathArgs,
  buildConfigReloadArgs,
  buildConfigShowArgs,
  buildThemeListArgs,
} from "./otty-core";
import {
  CONFIG_REFERENCE_URL,
  parseConfigReference,
  parseCustomizedKeys,
  settingType,
  toKebabKey,
  type Setting,
  type SettingDoc,
} from "./settings";
import {
  AUTO_DARK_MODE_KEY,
  buildThemeCatalog,
  parseTheme,
  previewFileName,
  THEME_KEYS,
  themePreviewSvg,
  type Theme,
  type ThemeListEntry,
} from "./themes";

const CONFIG_GET_CONCURRENCY = 12;

type ConfigShow = {
  config: Record<string, unknown>;
  path: string;
  /** Kebab-case keys that config.local.toml sets; `config set` writes those there. */
  local_keys?: string[];
};

/**
 * `config show` also reports computed and structured keys (`isDarkAppearance`,
 * `keybinds`, `ui-*` colors) that `config get`/`set` reject, so each key is
 * checked and those are dropped.
 */
export async function loadSettings(): Promise<Setting[]> {
  const { config, path, local_keys } = await runOttyJson<ConfigShow>(buildConfigShowArgs());
  const customized = new Set([
    ...parseCustomizedKeys(await readFile(path, "utf8").catch(() => "")),
    ...(local_keys ?? []),
  ]);
  const settings = await mapConcurrent(
    Object.entries(config),
    CONFIG_GET_CONCURRENCY,
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

/** A plain object, not a Map, since the cache stores JSON. */
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
  return (await readOtty(buildConfigPathArgs())).trim();
}

export async function changeSetting(args: string[]): Promise<void> {
  await runOtty(args);
  await runOtty(buildConfigReloadArgs()).catch((error) => {
    if (!(error instanceof OttyNotRunningError)) throw error;
  });
}

export async function applySetting(
  args: string[],
  success: { title: string; message?: string },
  failureTitle: string,
  onChange: () => void,
): Promise<boolean> {
  try {
    await changeSetting(args);
    await showToast({ style: Toast.Style.Success, ...success });
    onChange();
    return true;
  } catch (error) {
    await showFailure(failureTitle, error);
    return false;
  }
}

export type ThemeChoice = Theme & { previewPath?: string };

export type ThemeState = {
  themes: ThemeChoice[];
  light: string;
  dark: string;
  autoDarkMode: boolean;
};

async function readThemeFiles(): Promise<Theme[]> {
  const themesDir = join(dirname(await getConfigPath()), "themes");
  const fileNames = await readdir(themesDir).catch(() => [] as string[]);
  const themes = await Promise.all(
    fileNames
      .filter((name) => name.endsWith(".ottytheme"))
      .map((name) =>
        readFile(join(themesDir, name), "utf8")
          .then(parseTheme)
          .catch(() => undefined),
      ),
  );
  return themes.filter((theme): theme is Theme => Boolean(theme));
}

export async function loadThemeState(): Promise<ThemeState> {
  const [list, files, light, dark, autoDark] = await Promise.all([
    runOttyJson<ThemeListEntry[]>(buildThemeListArgs()),
    readThemeFiles(),
    readOtty(buildConfigGetArgs(THEME_KEYS.light)),
    readOtty(buildConfigGetArgs(THEME_KEYS.dark)),
    readOtty(buildConfigGetArgs(AUTO_DARK_MODE_KEY)),
  ]);

  const previewDir = join(environment.supportPath, "theme-previews");
  await mkdir(previewDir, { recursive: true });
  const themes = await Promise.all(
    buildThemeCatalog(list, files).map(async (theme): Promise<ThemeChoice> => {
      if (!theme.colors) return theme;
      const previewPath = join(previewDir, previewFileName(theme.name));
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
