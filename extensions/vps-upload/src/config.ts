import { LocalStorage } from "@raycast/api";

export interface Config {
  host: string;
  remoteDir: string;
}

export const DEFAULT_DIR = "/tmp/raycast-uploads";

const HOST_KEY = "sshHost";
const DIR_KEY = "remoteDir";

export async function loadConfig(): Promise<Config> {
  const host = (await LocalStorage.getItem<string>(HOST_KEY)) ?? "";
  const remoteDir =
    (await LocalStorage.getItem<string>(DIR_KEY)) ?? DEFAULT_DIR;
  return { host: host.trim(), remoteDir: (remoteDir || DEFAULT_DIR).trim() };
}

export async function saveConfig(config: Config): Promise<void> {
  await LocalStorage.setItem(HOST_KEY, config.host.trim());
  await LocalStorage.setItem(DIR_KEY, (config.remoteDir || DEFAULT_DIR).trim());
}
