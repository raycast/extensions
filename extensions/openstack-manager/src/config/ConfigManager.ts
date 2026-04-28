import { LocalStorage } from "@raycast/api";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import * as yaml from "js-yaml";
import { CloudConfig, CloudsYamlFile } from "./types";

const ACTIVE_CONFIG_KEY = "activeCloudConfig";

/**
 * Manages OpenStack cloud configurations stored in clouds.yaml
 * and the active config selection stored in Raycast LocalStorage.
 *
 * The YAML file path can be injected for testability; it defaults
 * to ~/.config/openstack/clouds.yaml.
 */
export class ConfigManager {
  private readonly yamlPath: string;

  constructor(yamlPath?: string) {
    this.yamlPath = yamlPath ?? path.join(os.homedir(), ".config", "openstack", "clouds.yaml");
  }

  /**
   * Lists all cloud configurations from clouds.yaml.
   * Returns an empty array if the file does not exist or has no entries.
   */
  async listConfigs(): Promise<CloudConfig[]> {
    const data = await this.readYaml();
    if (!data.clouds) {
      return [];
    }
    return Object.entries(data.clouds).map(([name, entry]) => this.toCloudConfig(name, entry));
  }

  /**
   * Returns a single cloud configuration by name, or null if not found.
   */
  async getConfig(name: string): Promise<CloudConfig | null> {
    const data = await this.readYaml();
    const entry = data.clouds?.[name];
    if (!entry) {
      return null;
    }
    return this.toCloudConfig(name, entry);
  }

  /**
   * Adds a new config or updates an existing one by name.
   * If no active config exists, the new config is auto-set as active.
   */
  async addOrUpdateConfig(config: CloudConfig): Promise<void> {
    const data = await this.readYaml();
    if (!data.clouds) {
      data.clouds = {};
    }

    const { name, ...entry } = config;
    data.clouds[name] = entry;

    await this.writeYaml(data);

    // Auto-set active config if none exists
    const active = await LocalStorage.getItem<string>(ACTIVE_CONFIG_KEY);
    if (!active) {
      await LocalStorage.setItem(ACTIVE_CONFIG_KEY, name);
    }
  }

  /**
   * Removes a config by name. If the removed config was the active one,
   * the active config is cleared.
   */
  async removeConfig(name: string): Promise<void> {
    const data = await this.readYaml();
    if (!data.clouds || !(name in data.clouds)) {
      return;
    }

    delete data.clouds[name];
    await this.writeYaml(data);

    // Clear active config if it was the removed one
    const active = await LocalStorage.getItem<string>(ACTIVE_CONFIG_KEY);
    if (active === name) {
      await LocalStorage.removeItem(ACTIVE_CONFIG_KEY);
    }
  }

  /**
   * Returns the currently active cloud configuration, or null
   * if no active config is set or the stored name no longer exists.
   */
  async getActiveConfig(): Promise<CloudConfig | null> {
    const activeName = await LocalStorage.getItem<string>(ACTIVE_CONFIG_KEY);
    if (!activeName) {
      return null;
    }
    return this.getConfig(activeName);
  }

  /**
   * Sets the active cloud configuration by name.
   */
  async setActiveConfig(name: string): Promise<void> {
    await LocalStorage.setItem(ACTIVE_CONFIG_KEY, name);
  }

  /**
   * Clears the active cloud configuration selection.
   */
  async clearActiveConfig(): Promise<void> {
    await LocalStorage.removeItem(ACTIVE_CONFIG_KEY);
  }

  /**
   * Reads and parses the clouds.yaml file.
   * Returns an empty structure if the file does not exist.
   */
  private async readYaml(): Promise<CloudsYamlFile> {
    try {
      const content = await fs.readFile(this.yamlPath, "utf-8");
      const parsed = yaml.load(content) as CloudsYamlFile | null;
      return parsed ?? { clouds: {} };
    } catch (error: unknown) {
      if (isNodeError(error) && error.code === "ENOENT") {
        return { clouds: {} };
      }
      throw error;
    }
  }

  /**
   * Writes the clouds.yaml file, creating the directory if needed.
   * Uses lineWidth: -1 to prevent js-yaml from wrapping long lines.
   */
  private async writeYaml(data: CloudsYamlFile): Promise<void> {
    const dir = path.dirname(this.yamlPath);
    await fs.mkdir(dir, { recursive: true });
    const content = yaml.dump(data, { lineWidth: -1 });
    await fs.writeFile(this.yamlPath, content, "utf-8");
  }

  /**
   * Converts a YAML entry (key + value) into a CloudConfig object.
   */
  private toCloudConfig(name: string, entry: Omit<CloudConfig, "name">): CloudConfig {
    return { name, ...entry };
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  if (error instanceof Error && "code" in error) {
    return true;
  }
  // Fallback: in some environments (e.g., Jest VM sandbox), instanceof
  // checks may fail across realm boundaries. Check duck-typing instead.
  if (typeof error === "object" && error !== null && "code" in error && "message" in error) {
    return true;
  }
  return false;
}
