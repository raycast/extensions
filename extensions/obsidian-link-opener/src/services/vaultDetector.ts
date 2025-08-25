import { promises as fs } from "fs";
import * as path from "path";
import * as os from "os";

export interface ObsidianVault {
  path: string;
  name?: string;
  ts: number; // timestamp of last opened
}

export interface ObsidianConfig {
  vaults: Record<string, ObsidianVault>;
  insider?: boolean;
  lastOpenedVault?: string;
}

export class VaultDetector {
  /**
   * Get the path to Obsidian's configuration file based on the current platform
   */
  private getObsidianConfigPath(): string {
    const platform = process.platform;
    const homeDir = os.homedir();

    switch (platform) {
      case "darwin": // macOS
        return path.join(
          homeDir,
          "Library",
          "Application Support",
          "obsidian",
          "obsidian.json"
        );
      case "win32": // Windows
        return path.join(
          process.env.APPDATA || path.join(homeDir, "AppData", "Roaming"),
          "obsidian",
          "obsidian.json"
        );
      case "linux":
        return path.join(homeDir, ".config", "obsidian", "obsidian.json");
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  /**
   * Read and parse the Obsidian configuration file
   */
  async readObsidianConfig(): Promise<ObsidianConfig | null> {
    try {
      const configPath = this.getObsidianConfigPath();
      const configData = await fs.readFile(configPath, "utf-8");
      return JSON.parse(configData) as ObsidianConfig;
    } catch (error) {
      // Config file doesn't exist or can't be read
      console.debug("Could not read Obsidian config:", error);
      return null;
    }
  }

  /**
   * Get a list of all registered Obsidian vaults
   */
  async getRegisteredVaults(): Promise<ObsidianVault[]> {
    const config = await this.readObsidianConfig();
    if (!config || !config.vaults) {
      return [];
    }

    // Convert vaults object to array and sort by last opened
    const vaults = Object.values(config.vaults);

    // Sort by timestamp (most recently used first)
    vaults.sort((a, b) => (b.ts || 0) - (a.ts || 0));

    // Filter out vaults that no longer exist
    const existingVaults: ObsidianVault[] = [];
    for (const vault of vaults) {
      try {
        const obsidianDir = path.join(vault.path, ".obsidian");
        await fs.access(obsidianDir);

        // Add name if not present
        if (!vault.name) {
          vault.name = path.basename(vault.path);
        }

        existingVaults.push(vault);
      } catch {
        // Vault no longer exists, skip it
        continue;
      }
    }

    return existingVaults;
  }

  /**
   * Try to find Obsidian vaults in common locations
   */
  async findVaultsInCommonLocations(): Promise<ObsidianVault[]> {
    const homeDir = os.homedir();
    const commonPaths = [
      path.join(homeDir, "Documents", "Obsidian"),
      path.join(homeDir, "Obsidian"),
      path.join(homeDir, "obsidian-vault"),
      path.join(homeDir, "notes"),
      path.join(homeDir, "Documents", "notes"),
      path.join(homeDir, "Documents", "Notes"),
    ];

    const foundVaults: ObsidianVault[] = [];

    for (const vaultPath of commonPaths) {
      try {
        const obsidianDir = path.join(vaultPath, ".obsidian");
        await fs.access(obsidianDir);

        // Extract vault name from path
        const name = path.basename(vaultPath);
        foundVaults.push({
          path: vaultPath,
          name,
          ts: Date.now(),
        });
      } catch {
        // Directory doesn't exist or doesn't contain .obsidian
        continue;
      }
    }

    return foundVaults;
  }

  /**
   * Get all available vaults (registered + common locations)
   */
  async getAllVaults(): Promise<ObsidianVault[]> {
    const [registeredVaults, commonVaults] = await Promise.all([
      this.getRegisteredVaults(),
      this.findVaultsInCommonLocations(),
    ]);

    // Deduplicate by path
    const vaultMap = new Map<string, ObsidianVault>();

    // Add registered vaults first (they have priority)
    for (const vault of registeredVaults) {
      vaultMap.set(vault.path, vault);
    }

    // Add vaults from common locations if not already registered
    for (const vault of commonVaults) {
      if (!vaultMap.has(vault.path)) {
        vaultMap.set(vault.path, vault);
      }
    }

    return Array.from(vaultMap.values());
  }

  /**
   * Get the most recently used vault
   */
  async getMostRecentVault(): Promise<ObsidianVault | null> {
    const vaults = await this.getRegisteredVaults();
    return vaults.length > 0 ? vaults[0] : null;
  }
}
