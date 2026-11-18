import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname } from "path";

export type SpaceSettings = Record<
  string,
  {
    customName: string | null;
    isEnabled: boolean;
  }
>;

export type SpaceSettingsIssue = {
  code: "invalid-settings" | "invalid-legacy-settings";
  path: string;
};

export type SpaceSettingsLoadResult = {
  settings: SpaceSettings;
  issues: SpaceSettingsIssue[];
  migratedLegacySettings: boolean;
};

type SpaceSettingsDocument = {
  version: 1;
  spaces: SpaceSettings;
};

type SpaceSettingsDeps = {
  fileExists: (targetPath: string) => boolean;
  readTextFile: (targetPath: string) => string;
  writeTextFile: (targetPath: string, value: string) => void;
  ensureDirectory: (targetPath: string) => void;
};

const defaultSpaceSettingsDeps: SpaceSettingsDeps = {
  fileExists: (targetPath) => existsSync(targetPath),
  readTextFile: (targetPath) => readFileSync(targetPath, "utf-8"),
  writeTextFile: (targetPath, value) => writeFileSync(targetPath, value),
  ensureDirectory: (targetPath) => mkdirSync(targetPath, { recursive: true }),
};

export class SpaceSettingsStore {
  constructor(
    private readonly settingsPath: string,
    private readonly legacySettingsPath: string,
    private readonly deps: SpaceSettingsDeps = defaultSpaceSettingsDeps,
  ) {}

  load(): SpaceSettingsLoadResult {
    if (this.deps.fileExists(this.settingsPath)) {
      const settings = readSettingsFile(this.settingsPath, this.deps);

      return settings
        ? { settings, issues: [], migratedLegacySettings: false }
        : {
            settings: {},
            issues: [{ code: "invalid-settings", path: this.settingsPath }],
            migratedLegacySettings: false,
          };
    }

    if (this.deps.fileExists(this.legacySettingsPath)) {
      const legacySettings = readLegacySettingsFile(this.legacySettingsPath, this.deps);

      if (!legacySettings) {
        return {
          settings: {},
          issues: [{ code: "invalid-legacy-settings", path: this.legacySettingsPath }],
          migratedLegacySettings: false,
        };
      }

      this.save(legacySettings);

      return {
        settings: legacySettings,
        issues: [],
        migratedLegacySettings: true,
      };
    }

    return { settings: {}, issues: [], migratedLegacySettings: false };
  }

  save(settings: SpaceSettings) {
    try {
      this.deps.ensureDirectory(dirname(this.settingsPath));
      this.deps.writeTextFile(this.settingsPath, JSON.stringify(buildSettingsDocument(settings), null, 2));
    } catch (error) {
      console.debug(`Failed to save space settings: ${error}`);
    }
  }
}

export const buildSettingsDocument = (settings: SpaceSettings): SpaceSettingsDocument => ({
  version: 1,
  spaces: settings,
});

export const normalizeSpaceSettings = (value: unknown): SpaceSettings => {
  if (!isRecord(value)) {
    return {};
  }

  return Object.entries(value).reduce<SpaceSettings>((accumulator, [spaceID, entry]) => {
    if (!isRecord(entry)) {
      return accumulator;
    }

    accumulator[spaceID] = {
      customName: typeof entry.customName === "string" ? entry.customName : null,
      isEnabled: typeof entry.isEnabled === "boolean" ? entry.isEnabled : true,
    };

    return accumulator;
  }, {});
};

const readSettingsFile = (settingsPath: string, deps: SpaceSettingsDeps): SpaceSettings | null => {
  try {
    const parsed = JSON.parse(deps.readTextFile(settingsPath)) as unknown;

    if (!isRecord(parsed) || parsed.version !== 1 || !("spaces" in parsed)) {
      return null;
    }

    return normalizeSpaceSettings(parsed.spaces);
  } catch {
    return null;
  }
};

const readLegacySettingsFile = (settingsPath: string, deps: SpaceSettingsDeps): SpaceSettings | null => {
  try {
    const parsed = JSON.parse(deps.readTextFile(settingsPath)) as unknown;

    return normalizeSpaceSettings(parsed);
  } catch {
    return null;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};
