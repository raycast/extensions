import { Icon, Image } from "@raycast/api";
import { existsSync, readFileSync, promises as fsPromises } from "fs";
import { homedir } from "os";
import { join } from "path";
import { parse as parseToml } from "toml";
import { parse as parseYaml } from "yaml";
import { SF_SYMBOL_OPTIONS } from "./sf-symbols";

type SupportedConfigFormat = "json" | "yaml" | "toml";

interface WorkspaceIconConfigEntry {
  name: string;
  symbolIconName?: string;
}

/**
 * Maps SF Symbol names to Raycast icons.
 * Built from SF_SYMBOL_OPTIONS for comprehensive coverage, with explicit legacy
 * entries to guarantee backward-compatibility for symbols already in user configs.
 */
const WORKSPACE_ICON_MAP: Record<string, Image.ImageLike> = {
  // Expanded set derived from the symbol picker options
  ...Object.fromEntries(SF_SYMBOL_OPTIONS.map(({ value, icon }) => [value, icon])),
  // Explicit legacy entries – these were the original 8 supported symbols and
  // must always resolve correctly even if SF_SYMBOL_OPTIONS changes.
  globe: Icon.Globe,
  message: Icon.Message,
  "text.book.closed": Icon.Book,
  movieclapper: Icon.FilmStrip,
  gamecontroller: Icon.GameController,
  headphones: Icon.Headphones,
  "person.2": Icon.PersonLines,
  "apple.terminal": Icon.Terminal,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseProfilesConfig(content: string, format: SupportedConfigFormat): unknown {
  switch (format) {
    case "json":
      return JSON.parse(content);
    case "yaml":
      return parseYaml(content);
    case "toml":
      return parseToml(content);
  }
}

export function extractWorkspaceIconConfig(
  profilesConfig: unknown,
  activeProfileName: string,
): WorkspaceIconConfigEntry[] {
  if (!isRecord(profilesConfig) || !Array.isArray(profilesConfig.profiles)) {
    return [];
  }

  const activeProfile = profilesConfig.profiles.find(
    (profile): profile is Record<string, unknown> =>
      isRecord(profile) && typeof profile.name === "string" && profile.name === activeProfileName,
  );

  if (!activeProfile || !Array.isArray(activeProfile.workspaces)) {
    return [];
  }

  return activeProfile.workspaces.flatMap((workspace) => {
    if (!isRecord(workspace) || typeof workspace.name !== "string") {
      return [];
    }

    return [
      {
        name: workspace.name,
        symbolIconName: typeof workspace.symbolIconName === "string" ? workspace.symbolIconName : undefined,
      },
    ];
  });
}

export function resolveWorkspaceIcon(symbolIconName?: string): Image.ImageLike {
  if (!symbolIconName) {
    return Icon.Window;
  }

  const normalized = symbolIconName.toLowerCase();

  if (normalized.startsWith("poweroutlet")) {
    return Icon.Power;
  }

  if (normalized.startsWith("questionmark")) {
    return Icon.QuestionMarkCircle;
  }

  return WORKSPACE_ICON_MAP[normalized] || Icon.Window;
}

export function loadWorkspaceIcons(activeProfileName: string, configDir = join(homedir(), ".config", "flashspace")) {
  const configFiles: Array<{ name: string; format: SupportedConfigFormat }> = [
    { name: "profiles.toml", format: "toml" },
    { name: "profiles.json", format: "json" },
    { name: "profiles.yaml", format: "yaml" },
    { name: "profiles.yml", format: "yaml" },
  ];

  for (const configFile of configFiles) {
    const configPath = join(configDir, configFile.name);
    if (!existsSync(configPath)) {
      continue;
    }

    try {
      const profilesConfig = parseProfilesConfig(readFileSync(configPath, "utf8"), configFile.format);
      return Object.fromEntries(
        extractWorkspaceIconConfig(profilesConfig, activeProfileName).map((workspace) => [
          workspace.name,
          resolveWorkspaceIcon(workspace.symbolIconName),
        ]),
      );
    } catch (error) {
      console.warn(`Failed to parse FlashSpace config file: ${configPath}`, error);
    }
  }

  return {};
}

/**
 * Async version of loadWorkspaceIcons that uses fs.promises to avoid blocking the UI.
 * Returns an icon map for the given profile, or an empty map when no config file is found.
 */
export async function loadWorkspaceIconsAsync(
  activeProfileName: string,
  configDir = join(homedir(), ".config", "flashspace"),
): Promise<Record<string, Image.ImageLike>> {
  const configFiles: Array<{ name: string; format: SupportedConfigFormat }> = [
    { name: "profiles.toml", format: "toml" },
    { name: "profiles.json", format: "json" },
    { name: "profiles.yaml", format: "yaml" },
    { name: "profiles.yml", format: "yaml" },
  ];

  for (const configFile of configFiles) {
    const configPath = join(configDir, configFile.name);
    let content: string;
    try {
      content = await fsPromises.readFile(configPath, "utf8");
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        continue;
      }
      console.warn(`Failed to read FlashSpace config file: ${configPath}`, err);
      continue;
    }

    try {
      const profilesConfig = parseProfilesConfig(content, configFile.format);
      return Object.fromEntries(
        extractWorkspaceIconConfig(profilesConfig, activeProfileName).map((workspace) => [
          workspace.name,
          resolveWorkspaceIcon(workspace.symbolIconName),
        ]),
      );
    } catch (error) {
      console.warn(`Failed to parse FlashSpace config file: ${configPath}`, error);
    }
  }

  return {};
}
