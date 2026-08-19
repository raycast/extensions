import { LocalStorage } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { logDiagnostic } from "./diagnostics";
import {
  defaultConfiguration,
  DeskConfiguration,
  DEFAULT_SIT_HEIGHT,
  DEFAULT_STAND_HEIGHT,
  validateConfiguration,
  validateTarget,
} from "./model";

export type PresetName = "sit" | "stand";

const keys = {
  sit: "preset.sit",
  stand: "preset.stand",
  deskSelection: "desk.selection",
  legacyDeskIdentifier: "desk.identifier",
  deskStatus: "desk.status",
  safetyAcknowledgedSelection: "safety.acknowledged-selection",
  legacySafetyAcknowledged: "safety.acknowledged",
  configuration: "desk.configuration",
} as const;

function deskStatusKey(selectionToken: string): string {
  return `${keys.deskStatus}.${selectionToken}`;
}

const deskIdentifierPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isDeskIdentifier(identifier: unknown): identifier is string {
  return (
    typeof identifier === "string" && deskIdentifierPattern.test(identifier)
  );
}

export type DeskSettings = {
  configuration: DeskConfiguration;
  presets: Record<PresetName, number>;
};

export type CachedDeskStatus = {
  heightCm: number;
  deskName?: string;
  updatedAt: number;
};

export type DeskSelection = {
  identifier: string;
  token: string;
};

type StoredCachedDeskStatus = CachedDeskStatus & {
  selectionToken?: string;
};

function isDeskSelection(value: unknown): value is DeskSelection {
  if (typeof value !== "object" || value === null) return false;
  const selection = value as Partial<DeskSelection>;
  return (
    isDeskIdentifier(selection.identifier) &&
    typeof selection.token === "string" &&
    selection.token.length > 0
  );
}

async function getStoredDeskSelection(): Promise<DeskSelection | undefined> {
  const stored = await LocalStorage.getItem<string>(keys.deskSelection);
  if (stored === undefined) return undefined;
  try {
    const parsed = JSON.parse(stored) as unknown;
    return isDeskSelection(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

async function clearDeskBoundState(): Promise<void> {
  const selection = await getStoredDeskSelection();
  await Promise.all([
    LocalStorage.removeItem(keys.deskSelection),
    LocalStorage.removeItem(keys.legacyDeskIdentifier),
    LocalStorage.removeItem(keys.deskStatus),
    ...(selection
      ? [LocalStorage.removeItem(deskStatusKey(selection.token))]
      : []),
    LocalStorage.removeItem(keys.safetyAcknowledgedSelection),
    LocalStorage.removeItem(keys.legacySafetyAcknowledged),
  ]);
}

export async function getPreset(name: PresetName): Promise<number> {
  const value = await LocalStorage.getItem<string>(keys[name]);
  const parsed = value === undefined ? Number.NaN : Number(value);
  if (Number.isFinite(parsed)) {
    return parsed;
  }
  return name === "sit" ? DEFAULT_SIT_HEIGHT : DEFAULT_STAND_HEIGHT;
}

export async function getPresets(): Promise<Record<PresetName, number>> {
  const [sit, stand] = await Promise.all([
    getPreset("sit"),
    getPreset("stand"),
  ]);
  return { sit, stand };
}

export async function savePreset(
  name: PresetName,
  height: number,
  configuration?: DeskConfiguration,
): Promise<void> {
  const activeConfiguration = configuration ?? (await getConfiguration());
  const validated = validateTarget(height, activeConfiguration);
  await LocalStorage.setItem(keys[name], String(validated));
}

export async function getConfiguration(): Promise<DeskConfiguration> {
  const stored = await LocalStorage.getItem<string>(keys.configuration);
  if (stored === undefined) return defaultConfiguration();

  try {
    const parsed = JSON.parse(stored) as DeskConfiguration;
    return validateConfiguration(parsed);
  } catch (error) {
    const configuration = defaultConfiguration();
    await clearDeskBoundState();
    await LocalStorage.setItem(
      keys.configuration,
      JSON.stringify(configuration),
    );
    await logDiagnostic("warning", "settings.invalid-restored", {
      message: error instanceof Error ? error.message : String(error),
    });
    return configuration;
  }
}

export async function saveConfiguration(
  configuration: DeskConfiguration,
): Promise<void> {
  const validated = validateConfiguration(configuration);
  await LocalStorage.setItem(keys.configuration, JSON.stringify(validated));
  await logDiagnostic("info", "settings.saved", {
    baseHeight: validated.baseHeight,
    minimumHeight: validated.minimumHeight,
    maximumHeight: validated.maximumHeight,
    stepHeight: validated.stepHeight,
  });
}

export async function saveSettings(settings: DeskSettings): Promise<void> {
  const configuration = validateConfiguration(settings.configuration);
  const sit = validateTarget(settings.presets.sit, configuration);
  const stand = validateTarget(settings.presets.stand, configuration);
  await saveConfiguration(configuration);
  await Promise.all([
    savePreset("sit", sit, configuration),
    savePreset("stand", stand, configuration),
    LocalStorage.removeItem(keys.safetyAcknowledgedSelection),
    LocalStorage.removeItem(keys.legacySafetyAcknowledged),
  ]);
}

export async function restoreDefaultSettings(): Promise<DeskSettings> {
  const settings: DeskSettings = {
    configuration: defaultConfiguration(),
    presets: { sit: DEFAULT_SIT_HEIGHT, stand: DEFAULT_STAND_HEIGHT },
  };
  await forgetDeskIdentifier();
  await saveSettings(settings);
  await logDiagnostic("info", "settings.restored-defaults");
  return settings;
}

export async function getCachedDeskStatus(): Promise<
  CachedDeskStatus | undefined
> {
  const selection = await getDeskSelection();
  if (!selection) return undefined;
  const scopedKey = deskStatusKey(selection.token);
  const scoped = await LocalStorage.getItem<string>(scopedKey);
  const stored =
    scoped ?? (await LocalStorage.getItem<string>(keys.deskStatus));
  if (stored === undefined) return undefined;

  try {
    const status = JSON.parse(stored) as StoredCachedDeskStatus;
    if (
      !Number.isFinite(status.heightCm) ||
      !Number.isFinite(status.updatedAt) ||
      (status.deskName !== undefined && typeof status.deskName !== "string")
    ) {
      return undefined;
    }
    if (
      status.selectionToken !== undefined &&
      status.selectionToken !== selection.token
    ) {
      return undefined;
    }
    if (status.selectionToken === undefined) {
      await LocalStorage.setItem(scopedKey, JSON.stringify(status));
      await LocalStorage.removeItem(keys.deskStatus);
    }
    return {
      heightCm: status.heightCm,
      deskName: status.deskName,
      updatedAt: status.updatedAt,
    };
  } catch {
    return undefined;
  }
}

export async function saveCachedDeskStatus(
  status: CachedDeskStatus,
  selectionToken: string,
): Promise<void> {
  const selection = await getDeskSelection();
  if (selection?.token !== selectionToken) return;
  await LocalStorage.setItem(
    deskStatusKey(selectionToken),
    JSON.stringify(status),
  );
}

export async function getDeskSelection(): Promise<DeskSelection | undefined> {
  const storedSelection = await getStoredDeskSelection();
  if (storedSelection) return storedSelection;
  if ((await LocalStorage.getItem<string>(keys.deskSelection)) !== undefined) {
    await clearDeskBoundState();
    return undefined;
  }

  const legacyIdentifier = await LocalStorage.getItem<string>(
    keys.legacyDeskIdentifier,
  );
  if (!legacyIdentifier) return undefined;
  if (!isDeskIdentifier(legacyIdentifier)) {
    await clearDeskBoundState();
    return undefined;
  }

  const selection = { identifier: legacyIdentifier, token: randomUUID() };
  await LocalStorage.setItem(keys.deskSelection, JSON.stringify(selection));
  await LocalStorage.removeItem(keys.legacyDeskIdentifier);
  return selection;
}

export async function requireDeskSelection(): Promise<DeskSelection> {
  const selection = await getDeskSelection();
  if (!selection) {
    throw new Error(
      "Select a desk in Desk Settings before using this command.",
    );
  }
  return selection;
}

export async function getDeskIdentifier(): Promise<string | undefined> {
  return (await getDeskSelection())?.identifier;
}

export async function selectDeskIdentifier(identifier: string): Promise<void> {
  if (!isDeskIdentifier(identifier)) {
    throw new Error("The selected desk identifier is invalid.");
  }
  const currentSelection = await getDeskSelection();
  if (currentSelection?.identifier === identifier) return;

  const selection = { identifier, token: randomUUID() };
  await LocalStorage.setItem(keys.deskSelection, JSON.stringify(selection));
  await Promise.all([
    LocalStorage.removeItem(keys.legacyDeskIdentifier),
    LocalStorage.removeItem(keys.deskStatus),
    ...(currentSelection
      ? [LocalStorage.removeItem(deskStatusKey(currentSelection.token))]
      : []),
    LocalStorage.removeItem(keys.safetyAcknowledgedSelection),
    LocalStorage.removeItem(keys.legacySafetyAcknowledged),
  ]);
}

export async function forgetDeskIdentifier(): Promise<void> {
  await clearDeskBoundState();
}

export async function hasAcknowledgedSafety(
  selectionToken?: string,
): Promise<boolean> {
  const selection = await getDeskSelection();
  if (!selection) return false;
  if (selectionToken !== undefined && selection.token !== selectionToken) {
    return false;
  }
  return (
    (await LocalStorage.getItem<string>(keys.safetyAcknowledgedSelection)) ===
    selection.token
  );
}

export async function acknowledgeSafety(selectionToken: string): Promise<void> {
  const selection = await requireDeskSelection();
  if (selection.token !== selectionToken) {
    throw new Error(
      "The selected desk changed. Review the safety notice again.",
    );
  }
  await LocalStorage.setItem(keys.safetyAcknowledgedSelection, selectionToken);
}
