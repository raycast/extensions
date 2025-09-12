import { LocalStorage } from '@raycast/api';
import { Config } from './types';

const CONFIG_KEY = 'nodePlayConfig';

export async function getConfig(): Promise<Config> {
  try {
    const stored = await LocalStorage.getItem<string>(CONFIG_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return { rootDirectories: [] };
  } catch {
    return { rootDirectories: [] };
  }
}

export async function saveConfig(config: Config): Promise<void> {
  await LocalStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export async function addRootDirectory(path: string): Promise<void> {
  const config = await getConfig();
  if (!config.rootDirectories.includes(path)) {
    config.rootDirectories.push(path);
    await saveConfig(config);
  }
}

export async function removeRootDirectory(path: string): Promise<void> {
  const config = await getConfig();
  config.rootDirectories = config.rootDirectories.filter((p) => p !== path);
  await saveConfig(config);
}
