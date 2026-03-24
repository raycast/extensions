import { Color, Icon, ImageLike } from "@raycast/api";
import rawCommandManifest from "./command-manifest.json";
import type { TextCommandConfig } from "./core/command";

export type CommandPreference = {
  name: string;
  type: string;
  required?: boolean;
  title: string;
  description?: string;
  placeholder?: string;
  default?: string;
  data?: Array<{
    title: string;
    value: string;
  }>;
};

type BaseCommandManifestEntry = {
  name: string;
  title: string;
  description: string;
  mode: "view" | "no-view";
  icon: string;
};

export type TextCommandManifestEntry = BaseCommandManifestEntry & {
  mode: "no-view";
  prompt: string;
  promptDescription?: string;
  preferences?: CommandPreference[];
};

export type ViewCommandConfig = BaseCommandManifestEntry & {
  mode: "view";
};

export type CommandManifestEntry = TextCommandManifestEntry | ViewCommandConfig;

export type CommandName = CommandManifestEntry["name"];

export const COMMAND_MANIFEST = rawCommandManifest as CommandManifestEntry[];

export function isTextCommandManifestEntry(
  entry: CommandManifestEntry,
): entry is TextCommandManifestEntry {
  return entry.mode === "no-view";
}

export function getCommandManifestEntry(
  name: CommandName,
): CommandManifestEntry {
  const command = COMMAND_MANIFEST.find((entry) => entry.name === name);
  if (!command) {
    throw new Error(`Unknown command manifest entry: ${name}`);
  }
  return command;
}

export function getTextCommandConfig(name: CommandName): TextCommandConfig {
  const command = getCommandManifestEntry(name);
  if (!isTextCommandManifestEntry(command)) {
    throw new Error(`Command ${name} is not a text command`);
  }
  return { ...command };
}

export function getViewCommandConfig(name: CommandName): ViewCommandConfig {
  const command = getCommandManifestEntry(name);
  if (isTextCommandManifestEntry(command)) {
    throw new Error(`Command ${name} is not a view command`);
  }
  return { ...command };
}
export function getCommandIcon(iconName?: string): ImageLike {
  if (!iconName) return Icon.Wand;

  if (iconName.endsWith(".svg")) {
    return { source: iconName, tintColor: Color.PrimaryText };
  }

  if (iconName.endsWith(".png")) {
    return { source: iconName };
  }

  const key = iconName.replace("Icon.", "") as keyof typeof Icon;
  return Icon[key] || Icon.Wand;
}
