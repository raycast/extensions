import path from "path";
import fs from "fs/promises";
import { jsonc } from "jsonc";

export type Config = {
  dir: string;
  domain: string;
  authorizedKeys?: string[];
  additionalDomains?: string[];
  apps?: {
    [name: string]: AppConfig;
  };
};

export type AppConfig = {
  admin: boolean;
  authorizedKeys?: string[];
  additionalDomains?: string[];
};

async function findConfigPath(dir: string): Promise<string | null> {
  for (const configPath of [path.join(dir, ".smallweb", "config.jsonc"), path.join(dir, ".smallweb", "config.json")]) {
    if (await fs.stat(configPath).catch(() => null)) {
      return configPath;
    }
  }

  return null;
}

export async function loadConfig(dir: string): Promise<Config> {
  const configPath = await findConfigPath(dir);
  if (!configPath) {
    throw new Error("No config file found in directory");
  }

  const content = await fs.readFile(configPath, "utf8");
  let config;
  try {
    config = jsonc.parse(content) as Config;
  } catch (e) {
    throw new Error(`Invalid JSON in config file: ${(e as Error).message}`);
  }

  config.dir = dir;
  return config;
}
