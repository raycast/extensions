import { getPreferenceValues } from "@raycast/api";
import { readJson, writeJson } from "./storage";
import {
  EffectiveSettings,
  MuteBehavior,
  QuickSettings,
  SectionOrder,
  VolumePrimaryAction,
} from "./types";

const QUICK_SETTINGS_KEY = "vm.quick-settings.v1";

function asMuteBehavior(value: string | undefined): MuteBehavior {
  if (value === "refresh-then-toggle") {
    return value;
  }
  if (value === "explicit-idempotent") {
    return value;
  }
  return "optimistic-toggle";
}

function asUndoSeconds(value: string | number | undefined): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) {
    return 10;
  }
  return Math.max(1, Math.min(300, Math.round(n)));
}

function asStep(value: string | number | undefined, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.max(0.1, Math.min(12, Math.round(n * 100) / 100));
}

function asVolumePrimaryAction(value: string | undefined): VolumePrimaryAction {
  return value === "decrease" ? "decrease" : "increase";
}

function asSectionOrder(value: string | undefined): SectionOrder {
  return value === "strips-first" ? "strips-first" : "buses-first";
}

export async function loadQuickSettings(): Promise<QuickSettings> {
  return readJson<QuickSettings>(QUICK_SETTINGS_KEY, {});
}

export async function saveQuickSettings(
  settings: QuickSettings,
): Promise<void> {
  await writeJson<QuickSettings>(QUICK_SETTINGS_KEY, settings);
}

interface Preferences {
  muteBehavior?: string;
  undoTtlSeconds?: string;
  voicemeeterExecutablePath?: string;
  increaseStep?: string;
  decreaseStep?: string;
  volumePrimaryAction?: string;
  sectionOrder?: string;
}

export async function getEffectiveSettings(): Promise<EffectiveSettings> {
  const preferences = getPreferenceValues<Preferences>();
  const quick = await loadQuickSettings();

  const muteBehavior =
    quick.muteBehavior ?? asMuteBehavior(preferences.muteBehavior);
  const undoTtlSeconds = asUndoSeconds(
    quick.undoTtlSeconds ?? preferences.undoTtlSeconds,
  );
  const executable = (
    quick.voicemeeterExecutablePath ?? preferences.voicemeeterExecutablePath
  )?.trim();
  const increaseStep = asStep(
    quick.increaseStep ?? preferences.increaseStep,
    1,
  );
  const decreaseStep = asStep(
    quick.decreaseStep ?? preferences.decreaseStep,
    1,
  );
  const volumePrimaryAction = asVolumePrimaryAction(
    quick.volumePrimaryAction ?? preferences.volumePrimaryAction,
  );
  const sectionOrder = asSectionOrder(
    quick.sectionOrder ?? preferences.sectionOrder,
  );

  return {
    muteBehavior,
    undoTtlSeconds,
    undoTtlMs: undoTtlSeconds * 1000,
    voicemeeterExecutablePath: executable ? executable : undefined,
    increaseStep,
    decreaseStep,
    volumePrimaryAction,
    sectionOrder,
  };
}
