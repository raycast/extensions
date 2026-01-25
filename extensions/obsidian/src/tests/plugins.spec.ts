import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { createTempVault } from "./helpers/createTemporaryVault";
import { ObsidianVault } from "@/obsidian";
import {
  readCommunityPlugins,
  readCorePlugins,
  VaultPluginCheckParams,
  vaultPluginCheck,
} from "@/obsidian/internal/plugins";

vi.mock("@raycast/api", () => ({
  getPreferenceValues: () => ({
    configFileName: ".obsidian",
  }),
}));

describe("plugins", () => {
  let tempVaultData: {
    vault: ObsidianVault;
    cleanup: () => void;
    paths: Record<string, string>;
  };

  beforeEach(() => {
    tempVaultData = createTempVault();
  });

  afterEach(() => {
    if (tempVaultData) {
      tempVaultData.cleanup();
    }
  });

  describe("readCommunityPlugins", () => {
    it("should return undefined when community-plugins.json does not exist", () => {
      const plugins = readCommunityPlugins(tempVaultData.vault.path);
      expect(plugins).toBeUndefined();
    });

    it("should read community plugins from community-plugins.json", () => {
      const communityPlugins = ["plugin1", "plugin2", "plugin3"];
      const pluginsPath = path.join(tempVaultData.vault.path, ".obsidian", "community-plugins.json");

      fs.writeFileSync(pluginsPath, JSON.stringify(communityPlugins));

      const result = readCommunityPlugins(tempVaultData.vault.path);
      expect(result).toEqual(communityPlugins);
    });

    it("should handle empty community plugins array", () => {
      const communityPlugins: string[] = [];
      const pluginsPath = path.join(tempVaultData.vault.path, ".obsidian", "community-plugins.json");

      fs.writeFileSync(pluginsPath, JSON.stringify(communityPlugins));

      const result = readCommunityPlugins(tempVaultData.vault.path);
      expect(result).toEqual([]);
    });
  });

  describe("readCorePlugins", () => {
    it("should return undefined when core-plugins.json does not exist", () => {
      const plugins = readCorePlugins(tempVaultData.vault.path);
      expect(plugins).toBeUndefined();
    });

    it("should read core plugins from core-plugins.json", () => {
      const corePlugins = {
        "file-explorer": true,
        search: false,
        "quick-switcher": true,
        graph: false,
      };
      const pluginsPath = path.join(tempVaultData.vault.path, ".obsidian", "core-plugins.json");

      fs.writeFileSync(pluginsPath, JSON.stringify(corePlugins));

      const result = readCorePlugins(tempVaultData.vault.path);
      expect(result).toEqual(corePlugins);
    });

    it("should handle empty core plugins object", () => {
      const corePlugins = {};
      const pluginsPath = path.join(tempVaultData.vault.path, ".obsidian", "core-plugins.json");

      fs.writeFileSync(pluginsPath, JSON.stringify(corePlugins));

      const result = readCorePlugins(tempVaultData.vault.path);
      expect(result).toEqual({});
    });
  });

  describe("vaultPluginCheck", () => {
    let vault2Data: {
      vault: ObsidianVault;
      cleanup: () => void;
      paths: Record<string, string>;
    };

    beforeEach(() => {
      vault2Data = createTempVault();
    });

    afterEach(() => {
      if (vault2Data) {
        vault2Data.cleanup();
      }
    });

    describe("community plugins check", () => {
      it("should return vaults that have all required community plugins", () => {
        // Setup vault 1 with required plugins
        const vault1Plugins = ["plugin1", "plugin2", "plugin3"];
        const vault1PluginsPath = path.join(tempVaultData.vault.path, ".obsidian", "community-plugins.json");
        fs.writeFileSync(vault1PluginsPath, JSON.stringify(vault1Plugins));

        // Setup vault 2 without required plugins
        const vault2Plugins = ["plugin1", "other-plugin"];
        const vault2PluginsPath = path.join(vault2Data.vault.path, ".obsidian", "community-plugins.json");
        fs.writeFileSync(vault2PluginsPath, JSON.stringify(vault2Plugins));

        const params: VaultPluginCheckParams = {
          vaults: [tempVaultData.vault, vault2Data.vault],
          communityPlugins: ["plugin1", "plugin2"],
        };

        const [vaultsWithPlugin, vaultsWithoutPlugin] = vaultPluginCheck(params);

        expect(vaultsWithPlugin).toHaveLength(1);
        expect(vaultsWithPlugin[0]).toBe(tempVaultData.vault);
        expect(vaultsWithoutPlugin).toHaveLength(1);
        expect(vaultsWithoutPlugin[0]).toBe(vault2Data.vault);
      });

      it("should return empty arrays when no vaults have required community plugins", () => {
        const vault1Plugins = ["other-plugin"];
        const vault1PluginsPath = path.join(tempVaultData.vault.path, ".obsidian", "community-plugins.json");
        fs.writeFileSync(vault1PluginsPath, JSON.stringify(vault1Plugins));

        const params: VaultPluginCheckParams = {
          vaults: [tempVaultData.vault],
          communityPlugins: ["required-plugin"],
        };

        const [vaultsWithPlugin, vaultsWithoutPlugin] = vaultPluginCheck(params);

        expect(vaultsWithPlugin).toHaveLength(0);
        expect(vaultsWithoutPlugin).toHaveLength(1);
      });

      it("should handle vaults without community-plugins.json file", () => {
        const params: VaultPluginCheckParams = {
          vaults: [tempVaultData.vault],
          communityPlugins: ["plugin1"],
        };

        const [vaultsWithPlugin, vaultsWithoutPlugin] = vaultPluginCheck(params);

        expect(vaultsWithPlugin).toHaveLength(0);
        expect(vaultsWithoutPlugin).toHaveLength(1);
      });
    });

    describe("core plugins check", () => {
      it("should return vaults that have all required core plugins enabled", () => {
        // Setup vault 1 with required plugins enabled
        const vault1Plugins = {
          "file-explorer": true,
          search: true,
          "quick-switcher": false,
        };
        const vault1PluginsPath = path.join(tempVaultData.vault.path, ".obsidian", "core-plugins.json");
        fs.writeFileSync(vault1PluginsPath, JSON.stringify(vault1Plugins));

        // Setup vault 2 with required plugin disabled
        const vault2Plugins = {
          "file-explorer": true,
          search: false,
        };
        const vault2PluginsPath = path.join(vault2Data.vault.path, ".obsidian", "core-plugins.json");
        fs.writeFileSync(vault2PluginsPath, JSON.stringify(vault2Plugins));

        const params: VaultPluginCheckParams = {
          vaults: [tempVaultData.vault, vault2Data.vault],
          corePlugins: ["file-explorer", "search"],
        };

        const [vaultsWithPlugin, vaultsWithoutPlugin] = vaultPluginCheck(params);

        expect(vaultsWithPlugin).toHaveLength(1);
        expect(vaultsWithPlugin[0]).toBe(tempVaultData.vault);
        expect(vaultsWithoutPlugin).toHaveLength(1);
        expect(vaultsWithoutPlugin[0]).toBe(vault2Data.vault);
      });

      it("should handle vaults without core-plugins.json file", () => {
        const params: VaultPluginCheckParams = {
          vaults: [tempVaultData.vault],
          corePlugins: ["file-explorer"],
        };

        const [vaultsWithPlugin, vaultsWithoutPlugin] = vaultPluginCheck(params);

        expect(vaultsWithPlugin).toHaveLength(0);
        expect(vaultsWithoutPlugin).toHaveLength(1);
      });

      it("should handle missing core plugins in the config", () => {
        const vault1Plugins = {
          "file-explorer": true,
        };
        const vault1PluginsPath = path.join(tempVaultData.vault.path, ".obsidian", "core-plugins.json");
        fs.writeFileSync(vault1PluginsPath, JSON.stringify(vault1Plugins));

        const params: VaultPluginCheckParams = {
          vaults: [tempVaultData.vault],
          corePlugins: ["file-explorer", "missing-plugin"],
        };

        const [vaultsWithPlugin, vaultsWithoutPlugin] = vaultPluginCheck(params);

        expect(vaultsWithPlugin).toHaveLength(0);
        expect(vaultsWithoutPlugin).toHaveLength(1);
      });
    });

    it("should return all vaults when no plugin types are specified", () => {
      const params: VaultPluginCheckParams = {
        vaults: [tempVaultData.vault],
      };

      const [vaultsWithPlugin, vaultsWithoutPlugin] = vaultPluginCheck(params);

      expect(vaultsWithPlugin).toEqual([tempVaultData.vault]);
      expect(vaultsWithoutPlugin).toEqual([]);
    });
  });
});
