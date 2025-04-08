import { LocalStorage } from "@raycast/api";

export interface AppItem {
  bundleId: string;
  startupArgs?: string;
}

export interface AppConfig {
  id: string;
  name: string;
  apps: AppItem[];
}

const STORAGE_KEY = "restart-app-configs";

export async function getAppConfigs(): Promise<AppConfig[]> {
  const storedData = await LocalStorage.getItem<string>(STORAGE_KEY);
  return storedData ? JSON.parse(storedData) : [];
}

export async function saveAppConfigs(configs: AppConfig[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
}

export async function addAppConfig(config: Omit<AppConfig, "id">): Promise<AppConfig> {
  const configs = await getAppConfigs();
  const newConfig = { ...config, id: Date.now().toString() };
  await saveAppConfigs([...configs, newConfig]);
  return newConfig;
}

export async function updateAppConfig(config: AppConfig): Promise<void> {
  const configs = await getAppConfigs();
  const updatedConfigs = configs.map((c) => (c.id === config.id ? config : c));
  await saveAppConfigs(updatedConfigs);
}

export async function deleteAppConfig(id: string): Promise<void> {
  const configs = await getAppConfigs();
  const filteredConfigs = configs.filter((c) => c.id !== id);
  await saveAppConfigs(filteredConfigs);
}

// Migration function to convert old config format to new format
export async function migrateConfigsIfNeeded(): Promise<void> {
  const storedData = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!storedData) return;

  const configs = JSON.parse(storedData);
  if (configs.length === 0) return;

  // Check if we need to migrate (if the first config has a bundleId property)
  const needsMigration = configs[0] && "bundleId" in configs[0];

  if (needsMigration) {
    interface OldAppConfig {
      id: string;
      name: string;
      bundleId: string;
      delay: number;
    }

    const migratedConfigs = configs.map((oldConfig: OldAppConfig) => ({
      id: oldConfig.id,
      name: oldConfig.name,
      apps: [
        {
          bundleId: oldConfig.bundleId,
          startupArgs: "",
        },
      ],
    }));

    await saveAppConfigs(migratedConfigs);
  }
}
