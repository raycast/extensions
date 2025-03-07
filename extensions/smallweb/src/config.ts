import path from "path";
import fs from "fs/promises";

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

export async function loadConfig(dir: string): Promise<Config> {
  const configPath = path.join(dir, ".smallweb", "config.json");
  const stat = await fs.stat(configPath).catch(() => null);
  if (!stat) {
    throw new Error("Config file not found");
  }

  const content = await fs.readFile(configPath, "utf8");
  const config = JSON.parse(content) as Config;
  config.dir = dir;
  return config;
}
