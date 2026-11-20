import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { environment, showToast, Toast } from "@raycast/api";
import { mapConcurrent } from "./concurrency";
import { OttyNotRunningError, readOtty, runOtty, runOttyJson, showFailure } from "./otty";
import {
  buildConfigGetArgs,
  buildConfigPathArgs,
  buildConfigReloadArgs,
  buildConfigSchemaArgs,
  buildConfigShowArgs,
  buildThemeListArgs,
} from "./otty-core";
import {
  configKeysFor,
  isListed,
  parseConfigSchema,
  parseCustomizedKeys,
  valueFromText,
  type SchemaEntry,
  type Setting,
} from "./settings";
import {
  AUTO_DARK_MODE_KEY,
  buildThemeCatalog,
  parseTheme,
  previewFileName,
  THEME_KEYS,
  themeOverrideKeys,
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
 * The schema names and groups every key, `config show` gives each value, and
 * `config get` its text in config-file syntax (`palette` as `N=#rrggbb` lines,
 * `scroll-to-bottom` as `keystroke,no-output`), which the edit form round-trips.
 */
export async function loadSettings(): Promise<Setting[]> {
  const { schema, config, customized } = await loadCustomizedKeys();
  const settings = await mapConcurrent(
    schema.filter((entry) => isListed(entry, configKeysFor(entry.key, customized).length > 0)),
    CONFIG_GET_CONCURRENCY,
    async (entry): Promise<Setting | undefined> => {
      const text = await readOtty(buildConfigGetArgs(entry.key)).catch(() => undefined);
      if (text === undefined) return undefined;
      const trimmed = text.replace(/\n$/, "");
      const configKeys = configKeysFor(entry.key, customized);
      return {
        key: entry.key,
        label: entry.label || entry.key,
        value: entry.field && entry.field in config ? config[entry.field] : valueFromText(entry, trimmed),
        text: trimmed,
        customized: configKeys.length > 0,
        configKeys,
        schema: entry,
      };
    },
  );
  return settings.filter((setting): setting is Setting => Boolean(setting));
}

/**
 * config.toml's text, or "" when the file doesn't exist (every setting at its default). Any other
 * read error throws: treating an unreadable file as empty would report no customizations, and
 * Change Otty Theme would then skip its override check and write.
 */
async function readConfigText(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return "";
    throw error;
  }
}

/** Read when a theme is picked, so the dark-mode note doesn't depend on the grid's cache. */
export async function loadAutoDarkMode(): Promise<boolean> {
  return (await readOtty(buildConfigGetArgs(AUTO_DARK_MODE_KEY))).trim() === "true";
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

/**
 * The keys the config sets right now, in config.toml or config.local.toml (the same "customized"
 * rule `loadSettings` uses, since it calls this). Every write that resets several keys reads this at action time, so it
 * never works from a list that went stale while a command stayed open.
 */
export async function loadCustomizedKeys(): Promise<{
  customized: Set<string>;
  schema: SchemaEntry[];
  config: ConfigShow["config"];
}> {
  const [schema, { config, path, local_keys }] = await Promise.all([
    runOttyJson<unknown>(buildConfigSchemaArgs()).then(parseConfigSchema),
    runOttyJson<ConfigShow>(buildConfigShowArgs()),
  ]);
  const customized = new Set([...parseCustomizedKeys(await readConfigText(path)), ...(local_keys ?? [])]);
  return { customized, schema, config };
}

/** The color keys the config sets right now, which hide every theme (`themeOverrideKeys`). */
export async function loadThemeOverrides(): Promise<string[]> {
  const { customized, schema } = await loadCustomizedKeys();
  return themeOverrideKeys(customized, schema);
}

/** The keys to unset to reset a settings row, read now: the Palette row also owns its `palette-N` lines. */
export async function loadResetKeys(key: string): Promise<string[]> {
  const keys = configKeysFor(key, (await loadCustomizedKeys()).customized);
  return keys.length > 0 ? keys : [key];
}
