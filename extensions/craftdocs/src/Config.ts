import { readdirSync } from "fs";
import {
  getEnabledSpaces,
  getPrimarySpace,
  getSpaceDisplayName,
  getSpacesForDropdown,
} from "./lib/craftSpaceSelectors";
import { CraftEnvironmentResult } from "./lib/craftEnvironment";
import { discoverSpaces, SpaceSQLite } from "./lib/craftSpaces";
import { SpaceSettings, SpaceSettingsStore } from "./lib/spaceSettings";

export type ConfigIssue = {
  code: "invalid-settings" | "invalid-legacy-settings" | "space-discovery-failed";
};

export type ReadyCraftEnvironment = Extract<CraftEnvironmentResult, { status: "ready" }>;

export type CraftConfigSnapshot = {
  craftEnvironment: ReadyCraftEnvironment;
  spaces: SpaceSQLite[];
  issues: ConfigIssue[];
  spaceSettings: SpaceSettings;
  settingsStore: SpaceSettingsStore;
};

export type CraftConfig = {
  spaces: SpaceSQLite[];
  issues: ConfigIssue[];
  primarySpace: SpaceSQLite | null;
  enabledSpaces: SpaceSQLite[];
  spacesForDropdown: Array<{ id: string; title: string }>;
  getSpaceDisplayName: (spaceID: string) => string;
};

export const loadCraftConfigSnapshot = (craftEnvironment: ReadyCraftEnvironment): CraftConfigSnapshot => {
  const settingsStore = new SpaceSettingsStore(craftEnvironment.settingsPath, craftEnvironment.legacySettingsPath);
  const settingsLoadResult = settingsStore.load();
  const issues = settingsLoadResult.issues.map((issue) => ({ code: issue.code }));

  try {
    return {
      craftEnvironment,
      settingsStore,
      spaceSettings: settingsLoadResult.settings,
      issues,
      spaces: discoverSpaces({
        dataRoot: craftEnvironment.dataRoot,
        searchPath: craftEnvironment.searchPath,
        settings: settingsLoadResult.settings,
        readDirectory: (targetPath) => readdirSync(targetPath),
      }),
    };
  } catch {
    return {
      craftEnvironment,
      settingsStore,
      spaceSettings: settingsLoadResult.settings,
      issues: [...issues, { code: "space-discovery-failed" }],
      spaces: [],
    };
  }
};

export const buildCraftConfig = (snapshot: CraftConfigSnapshot): CraftConfig => ({
  spaces: snapshot.spaces,
  issues: snapshot.issues,
  primarySpace: getPrimarySpace(snapshot.spaces),
  enabledSpaces: getEnabledSpaces(snapshot.spaces),
  spacesForDropdown: getSpacesForDropdown(snapshot.spaces),
  getSpaceDisplayName: (spaceID: string) => getSpaceDisplayName(snapshot.spaces, spaceID),
});

export const updateSpaceCustomName = (
  snapshot: CraftConfigSnapshot,
  spaceID: string,
  customName: string | null,
): CraftConfigSnapshot => {
  const nextSpaceSettings: SpaceSettings = {
    ...snapshot.spaceSettings,
    [spaceID]: {
      customName,
      isEnabled: snapshot.spaceSettings[spaceID]?.isEnabled ?? true,
    },
  };

  snapshot.settingsStore.save(nextSpaceSettings);

  return {
    ...snapshot,
    spaceSettings: nextSpaceSettings,
    spaces: snapshot.spaces.map((space) => (space.spaceID === spaceID ? { ...space, customName } : space)),
  };
};

export const toggleSpaceEnabled = (snapshot: CraftConfigSnapshot, spaceID: string): CraftConfigSnapshot => {
  const currentSpace = snapshot.spaces.find((space) => space.spaceID === spaceID);
  const nextIsEnabled = currentSpace ? !currentSpace.isEnabled : !(snapshot.spaceSettings[spaceID]?.isEnabled ?? true);
  const nextSpaceSettings: SpaceSettings = {
    ...snapshot.spaceSettings,
    [spaceID]: {
      customName: snapshot.spaceSettings[spaceID]?.customName ?? currentSpace?.customName ?? null,
      isEnabled: nextIsEnabled,
    },
  };

  snapshot.settingsStore.save(nextSpaceSettings);

  return {
    ...snapshot,
    spaceSettings: nextSpaceSettings,
    spaces: snapshot.spaces.map((space) =>
      space.spaceID === spaceID ? { ...space, isEnabled: nextIsEnabled } : space,
    ),
  };
};
