import { environment } from "@raycast/api";
import fs from "fs";
import path from "path";

export type OktaEnv = {
  domain: string;
  token: string;
};

export type Config = {
  current: string | null;
  envs: Record<string, OktaEnv>;
};

const CONFIG_PATH = path.join(environment.supportPath, "okta-config.json");

function ensureDir() {
  if (!fs.existsSync(environment.supportPath)) {
    fs.mkdirSync(environment.supportPath, { recursive: true });
  }
}

export function getConfig(): Config {
  ensureDir();
  if (!fs.existsSync(CONFIG_PATH)) {
    return { current: null, envs: {} };
  }
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { current: null, envs: {} };
  }
}

export function saveConfig(config: Config) {
  ensureDir();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export function addEnv(name: string, env: OktaEnv) {
  const config = getConfig();
  config.envs[name] = env;
  if (!config.current) {
    config.current = name;
  }
  saveConfig(config);
}

export function removeEnv(name: string) {
  const config = getConfig();
  delete config.envs[name];
  if (config.current === name) {
    const keys = Object.keys(config.envs);
    config.current = keys.length > 0 ? keys[0] : null;
  }
  saveConfig(config);
}

export function setCurrentEnv(name: string) {
  const config = getConfig();
  if (config.envs[name]) {
    config.current = name;
    saveConfig(config);
  }
}

export function getCurrentEnv(): { name: string; env: OktaEnv } | null {
  const config = getConfig();
  if (!config.current || !config.envs[config.current]) {
    return null;
  }
  return { name: config.current, env: config.envs[config.current] };
}
