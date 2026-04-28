// Feature: openstack-manager, Properties 1–6: ConfigManager property-based and unit tests

import * as fc from "fast-check";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { ConfigManager } from "../config/ConfigManager";
import { CloudConfig } from "../config/types";

// Import the mock's internal storage for clearing between tests
// The @raycast/api module is automatically mocked via moduleNameMapper in jest.config.ts
import { LocalStorage } from "@raycast/api";
const mockStorage = (LocalStorage as unknown as { __storage: Map<string, string> }).__storage;

// --- Arbitrary generators ---

const cloudConfigArb = fc.record({
  name: fc
    .string({ minLength: 1, maxLength: 30 })
    .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s))
    .filter((s) => !["__proto__", "constructor", "toString", "valueOf", "hasOwnProperty"].includes(s)),
  auth_type: fc.constant("v3applicationcredential" as const),
  auth: fc.record({
    auth_url: fc.webUrl(),
    application_credential_id: fc.uuid(),
    application_credential_secret: fc.string({ minLength: 10, maxLength: 50 }),
  }),
  region_name: fc.string({ minLength: 1, maxLength: 20 }).filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
  interface: fc.constantFrom("public" as const, "internal" as const, "admin" as const),
  identity_api_version: fc.constant(3 as const),
  horizon_url: fc.option(fc.webUrl(), { nil: undefined }),
});

/** Generate an array of CloudConfigs with unique names */
const uniqueConfigsArb = (opts: { minLength?: number; maxLength?: number } = {}) =>
  fc
    .array(cloudConfigArb, {
      minLength: opts.minLength ?? 1,
      maxLength: opts.maxLength ?? 30,
    })
    .map((configs) => {
      const seen = new Set<string>();
      return configs.filter((c) => {
        if (seen.has(c.name)) return false;
        seen.add(c.name);
        return true;
      });
    })
    .filter((configs) => configs.length >= (opts.minLength ?? 1));

// --- Helpers ---

async function makeTempDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "configmanager-test-"));
}

function createManager(tmpDir: string): ConfigManager {
  const yamlPath = path.join(tmpDir, "clouds.yaml");
  return new ConfigManager(yamlPath);
}

/** Strips undefined fields for deep equality comparison */
function normalize(config: CloudConfig): CloudConfig {
  const result = { ...config };
  if (result.horizon_url === undefined) {
    delete (result as Partial<CloudConfig>).horizon_url;
  }
  return result;
}

/** Adds all configs to a manager sequentially */
async function addAll(manager: ConfigManager, configs: CloudConfig[]): Promise<void> {
  for (const config of configs) {
    await manager.addOrUpdateConfig(config);
  }
}

// --- Property-Based Tests ---

describe("ConfigManager - Property 1: clouds.yaml round-trip preserves all config data", () => {
  // **Validates: Requirements 1.1, 1.10**
  it("serialize then deserialize returns the original CloudConfig", async () => {
    await fc.assert(
      fc.asyncProperty(cloudConfigArb, async (config: CloudConfig) => {
        const tmpDir = await makeTempDir();
        try {
          mockStorage.clear();
          const manager = createManager(tmpDir);

          await manager.addOrUpdateConfig(config);
          const retrieved = await manager.getConfig(config.name);

          expect(retrieved).not.toBeNull();
          expect(normalize(retrieved!)).toEqual(normalize(config));
        } finally {
          await fs.rm(tmpDir, { recursive: true, force: true });
        }
      }),
      { numRuns: 100 },
    );
  });
});

describe("ConfigManager - Property 2: Config merge preserves existing entries", () => {
  // **Validates: Requirements 1.3**
  it("adding a new config leaves all originals unchanged", async () => {
    await fc.assert(
      fc.asyncProperty(
        uniqueConfigsArb({ minLength: 1, maxLength: 10 }),
        cloudConfigArb,
        async (existingConfigs: CloudConfig[], newConfig: CloudConfig) => {
          // Ensure the new config has a unique name
          const existingNames = new Set(existingConfigs.map((c) => c.name));
          fc.pre(!existingNames.has(newConfig.name));

          const tmpDir = await makeTempDir();
          try {
            mockStorage.clear();
            const manager = createManager(tmpDir);

            // Add existing configs
            await addAll(manager, existingConfigs);

            // Snapshot originals
            const originals: CloudConfig[] = [];
            for (const c of existingConfigs) {
              const retrieved = await manager.getConfig(c.name);
              originals.push(retrieved!);
            }

            // Add the new config
            await manager.addOrUpdateConfig(newConfig);

            // Verify all originals are unchanged
            for (let i = 0; i < existingConfigs.length; i++) {
              const after = await manager.getConfig(existingConfigs[i].name);
              expect(normalize(after!)).toEqual(normalize(originals[i]));
            }

            // Verify the new config is present
            const newRetrieved = await manager.getConfig(newConfig.name);
            expect(newRetrieved).not.toBeNull();
            expect(normalize(newRetrieved!)).toEqual(normalize(newConfig));
          } finally {
            await fs.rm(tmpDir, { recursive: true, force: true });
          }
        },
      ),
      { numRuns: 100 },
    );
  }, 30_000);
});

describe("ConfigManager - Property 3: Config update isolates changes", () => {
  // **Validates: Requirements 1.4**
  it("updating one config leaves all others unchanged", async () => {
    await fc.assert(
      fc.asyncProperty(
        uniqueConfigsArb({ minLength: 2, maxLength: 10 }),
        cloudConfigArb,
        async (configs: CloudConfig[], updatedFields: CloudConfig) => {
          const tmpDir = await makeTempDir();
          try {
            mockStorage.clear();
            const manager = createManager(tmpDir);

            await addAll(manager, configs);

            // Pick the first config to update, keep its name
            const targetName = configs[0].name;
            const updatedConfig: CloudConfig = {
              ...updatedFields,
              name: targetName,
            };

            // Snapshot all non-target configs
            const others = configs.slice(1);
            const otherSnapshots: CloudConfig[] = [];
            for (const c of others) {
              const retrieved = await manager.getConfig(c.name);
              otherSnapshots.push(retrieved!);
            }

            // Perform the update
            await manager.addOrUpdateConfig(updatedConfig);

            // Verify all non-target configs are unchanged
            for (let i = 0; i < others.length; i++) {
              const after = await manager.getConfig(others[i].name);
              expect(normalize(after!)).toEqual(normalize(otherSnapshots[i]));
            }

            // Verify the target was updated
            const targetAfter = await manager.getConfig(targetName);
            expect(normalize(targetAfter!)).toEqual(normalize(updatedConfig));
          } finally {
            await fs.rm(tmpDir, { recursive: true, force: true });
          }
        },
      ),
      { numRuns: 100 },
    );
  }, 30_000);
});

describe("ConfigManager - Property 4: Config removal isolates deletions", () => {
  // **Validates: Requirements 1.5**
  it("removing one config leaves all others unchanged and the removed one absent", async () => {
    await fc.assert(
      fc.asyncProperty(uniqueConfigsArb({ minLength: 2, maxLength: 10 }), async (configs: CloudConfig[]) => {
        const tmpDir = await makeTempDir();
        try {
          mockStorage.clear();
          const manager = createManager(tmpDir);

          await addAll(manager, configs);

          // Pick the first config to remove
          const targetName = configs[0].name;
          const others = configs.slice(1);

          // Snapshot non-target configs
          const otherSnapshots: CloudConfig[] = [];
          for (const c of others) {
            const retrieved = await manager.getConfig(c.name);
            otherSnapshots.push(retrieved!);
          }

          // Remove the target
          await manager.removeConfig(targetName);

          // Verify the removed config is absent
          const removed = await manager.getConfig(targetName);
          expect(removed).toBeNull();

          // Verify all others are unchanged
          for (let i = 0; i < others.length; i++) {
            const after = await manager.getConfig(others[i].name);
            expect(normalize(after!)).toEqual(normalize(otherSnapshots[i]));
          }
        } finally {
          await fs.rm(tmpDir, { recursive: true, force: true });
        }
      }),
      { numRuns: 100 },
    );
  }, 30_000);
});

describe("ConfigManager - Property 5: Active config round-trip", () => {
  // **Validates: Requirements 1.6**
  it("set active then get active returns the same name", async () => {
    await fc.assert(
      fc.asyncProperty(uniqueConfigsArb({ minLength: 1, maxLength: 10 }), async (configs: CloudConfig[]) => {
        const tmpDir = await makeTempDir();
        try {
          mockStorage.clear();
          const manager = createManager(tmpDir);

          await addAll(manager, configs);

          // Pick a random config to set as active
          const target = configs[configs.length - 1];
          await manager.setActiveConfig(target.name);

          const activeConfig = await manager.getActiveConfig();
          expect(activeConfig).not.toBeNull();
          expect(activeConfig!.name).toBe(target.name);
        } finally {
          await fs.rm(tmpDir, { recursive: true, force: true });
        }
      }),
      { numRuns: 100 },
    );
  }, 30_000);
});

describe("ConfigManager - Property 6: Large config sets are fully preserved", () => {
  // **Validates: Requirements 1.9**
  it("storing ≥20 configs and reading back returns the original set", async () => {
    await fc.assert(
      fc.asyncProperty(uniqueConfigsArb({ minLength: 20, maxLength: 30 }), async (configs: CloudConfig[]) => {
        const tmpDir = await makeTempDir();
        try {
          mockStorage.clear();
          const manager = createManager(tmpDir);

          await addAll(manager, configs);

          const allConfigs = await manager.listConfigs();
          expect(allConfigs.length).toBe(configs.length);

          // Build a map for easy lookup
          const configMap = new Map(allConfigs.map((c) => [c.name, c]));
          for (const original of configs) {
            const retrieved = configMap.get(original.name);
            expect(retrieved).toBeDefined();
            expect(normalize(retrieved!)).toEqual(normalize(original));
          }
        } finally {
          await fs.rm(tmpDir, { recursive: true, force: true });
        }
      }),
      { numRuns: 100 },
    );
  }, 120_000);
});

// --- Unit Tests (Task 4.4) ---

describe("ConfigManager - Unit Tests", () => {
  let tmpDir: string;
  let manager: ConfigManager;

  beforeEach(async () => {
    mockStorage.clear();
    tmpDir = await makeTempDir();
    manager = createManager(tmpDir);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  const sampleConfig: CloudConfig = {
    name: "test-cloud",
    auth_type: "v3applicationcredential",
    auth: {
      auth_url: "https://keystone.example.com:5000/v3",
      application_credential_id: "abc-123",
      application_credential_secret: "secret-value-here",
    },
    region_name: "RegionOne",
    interface: "public",
    identity_api_version: 3,
    horizon_url: "https://horizon.example.com",
  };

  // Validates: Requirements 1.2
  describe("creating clouds.yaml when it does not exist", () => {
    it("creates the file and stores the config", async () => {
      const yamlPath = path.join(tmpDir, "clouds.yaml");

      // Verify file does not exist yet
      await expect(fs.access(yamlPath)).rejects.toThrow();

      await manager.addOrUpdateConfig(sampleConfig);

      // Verify file was created
      await expect(fs.access(yamlPath)).resolves.toBeUndefined();

      // Verify config is retrievable
      const retrieved = await manager.getConfig("test-cloud");
      expect(retrieved).not.toBeNull();
      expect(retrieved!.name).toBe("test-cloud");
      expect(retrieved!.auth.auth_url).toBe("https://keystone.example.com:5000/v3");
    });
  });

  // Validates: Requirements 1.2
  describe("reading an empty clouds.yaml", () => {
    it("returns an empty list when clouds.yaml is empty", async () => {
      const yamlPath = path.join(tmpDir, "clouds.yaml");
      await fs.writeFile(yamlPath, "", "utf-8");

      const configs = await manager.listConfigs();
      expect(configs).toEqual([]);
    });

    it("returns an empty list when clouds.yaml has no clouds key", async () => {
      const yamlPath = path.join(tmpDir, "clouds.yaml");
      await fs.writeFile(yamlPath, "# empty config\n", "utf-8");

      const configs = await manager.listConfigs();
      expect(configs).toEqual([]);
    });
  });

  // Validates: Requirements 1.3, 1.4
  describe("duplicate name triggers update (not duplicate entry)", () => {
    it("updates the existing entry instead of creating a duplicate", async () => {
      await manager.addOrUpdateConfig(sampleConfig);

      const updatedConfig: CloudConfig = {
        ...sampleConfig,
        region_name: "RegionTwo",
        horizon_url: "https://new-horizon.example.com",
      };
      await manager.addOrUpdateConfig(updatedConfig);

      const allConfigs = await manager.listConfigs();
      expect(allConfigs.length).toBe(1);

      const retrieved = await manager.getConfig("test-cloud");
      expect(retrieved!.region_name).toBe("RegionTwo");
      expect(retrieved!.horizon_url).toBe("https://new-horizon.example.com");
    });
  });

  // Validates: Requirements 1.3, 1.6
  describe("auto-set active on first add", () => {
    it("sets the first added config as active when no active config exists", async () => {
      expect(mockStorage.has("activeCloudConfig")).toBe(false);

      await manager.addOrUpdateConfig(sampleConfig);

      expect(mockStorage.get("activeCloudConfig")).toBe("test-cloud");

      const active = await manager.getActiveConfig();
      expect(active).not.toBeNull();
      expect(active!.name).toBe("test-cloud");
    });

    it("does not change active config when one already exists", async () => {
      await manager.addOrUpdateConfig(sampleConfig);
      expect(mockStorage.get("activeCloudConfig")).toBe("test-cloud");

      const secondConfig: CloudConfig = {
        ...sampleConfig,
        name: "second-cloud",
        region_name: "RegionTwo",
      };
      await manager.addOrUpdateConfig(secondConfig);

      // Active should still be the first one
      expect(mockStorage.get("activeCloudConfig")).toBe("test-cloud");
    });
  });

  // Validates: Requirements 1.5, 1.6
  describe("clear active on remove of active config", () => {
    it("clears active config when the active config is removed", async () => {
      await manager.addOrUpdateConfig(sampleConfig);
      expect(mockStorage.get("activeCloudConfig")).toBe("test-cloud");

      await manager.removeConfig("test-cloud");

      expect(mockStorage.has("activeCloudConfig")).toBe(false);

      const active = await manager.getActiveConfig();
      expect(active).toBeNull();
    });

    it("does not clear active config when a non-active config is removed", async () => {
      await manager.addOrUpdateConfig(sampleConfig);

      const secondConfig: CloudConfig = {
        ...sampleConfig,
        name: "second-cloud",
        region_name: "RegionTwo",
      };
      await manager.addOrUpdateConfig(secondConfig);

      // Active is "test-cloud", remove "second-cloud"
      await manager.removeConfig("second-cloud");

      expect(mockStorage.get("activeCloudConfig")).toBe("test-cloud");

      const active = await manager.getActiveConfig();
      expect(active).not.toBeNull();
      expect(active!.name).toBe("test-cloud");
    });
  });
});
