import { Toast, showToast, open } from "@raycast/api";
import fs from "fs";
import path from "path";
import os from "os";
import TOML from "@iarna/toml";
import { spawnSync } from "child_process";
import { env } from "./appSwitcher";

export interface Binding {
  [key: string]: never; // Define more specifically if possible, replacing any with a more precise type
}

export interface ModeConfig {
  binding?: Binding;
}

export interface AppConfig {
  mode?: {
    [key: string]: ModeConfig;
  };
}

export interface Shortcut {
  mode: string;
  shortcut: string;
  description: string;
}

function readConfigFile(configPath: string): { content?: string; error?: string } {
  if (!fs.existsSync(configPath)) {
    return { error: "Config file does not exist. Please check the path in preferences." };
  }

  try {
    const content = fs.readFileSync(configPath, "utf-8");
    return { content };
  } catch (error) {
    let errorMessage: string;

    if (error instanceof Error) {
      errorMessage = `Error reading config file: ${error.message}`;
    } else {
      // This branch is highly unlikely to be reached since fs.readFileSync should always throw an Error, but it's safe to handle any type of throw.
      errorMessage = "Error reading config file: An unexpected error occurred.";
    }

    console.error(errorMessage);
    return { error: errorMessage };
  }
}

function parseTOML(content: string): { config?: AppConfig; error?: string } {
  try {
    const config = TOML.parse(content);
    return { config };
  } catch (error) {
    let errorMessage: string;

    if (error instanceof Error) {
      errorMessage = `Error parsing config file: ${error.message}`;
    } else {
      errorMessage = "Error parsing config file: An unexpected error occurred.";
    }

    console.error(errorMessage);
    return { error: errorMessage };
  }
}

export function getConfigPath(): { configPath: string } {
  const args = ["config", "--config-path"];
  let configPath = spawnSync("aerospace", args, {
    env: env(),
    encoding: "utf8",
    timeout: 15000,
  }).stdout.trim();

  if (configPath.startsWith("~")) {
    configPath = path.join(os.homedir(), configPath.slice(1));
  }

  return { configPath };
}

export function getConfig(): { config?: AppConfig; error?: string } {
  const { configPath } = getConfigPath();
  console.log("Config file path as is:", configPath);

  const { content, error: readFileError } = readConfigFile(configPath);
  if (readFileError) {
    console.error(readFileError);
    return { error: readFileError };
  }

  const { config, error: parseError } = parseTOML(content!);
  if (parseError) {
    console.error(parseError);
    return { error: parseError };
  }

  console.log("Config:", config);
  return { config };
}

export async function handleConfigError(error: string) {
  const options: Toast.Options = {
    style: Toast.Style.Failure,
    title: "Config Error",
    message: error,
    primaryAction: {
      title: "Install Aerospace and try again",
      onAction: (toast) => {
        open("https://nikitabobko.github.io/AeroSpace/guide#installation");
        toast.hide();
      },
    },
  };

  await showToast(options);
}
