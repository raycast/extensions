import type { Creativity } from "./fm/args";

export const DEFAULT_TIMEOUT_SECONDS = 60;

const DEFAULT_MODEL = "system";
const DEFAULT_CREATIVITY: Creativity = "normal";
const MIN_TIMEOUT_SECONDS = 5;
const MAX_TIMEOUT_SECONDS = 600;

export interface RawPreferences {
  defaultModel?: string;
  defaultCreativity?: string;
  quickAiIncludeSelection?: boolean;
  copySelectionFallback?: boolean;
  timeoutSeconds?: string;
}

export interface Settings {
  defaultModel: string;
  defaultCreativity: Creativity;
  quickAiIncludeSelection: boolean;
  copySelectionFallback: boolean;
  timeoutMs: number;
}

export function parseSettings(raw: RawPreferences): Settings {
  return {
    defaultModel: raw.defaultModel?.trim() || DEFAULT_MODEL,
    defaultCreativity: raw.defaultCreativity === "precise" ? "precise" : DEFAULT_CREATIVITY,
    quickAiIncludeSelection: raw.quickAiIncludeSelection ?? true,
    copySelectionFallback: raw.copySelectionFallback ?? false,
    timeoutMs: parseTimeoutSeconds(raw.timeoutSeconds) * 1000,
  };
}

function parseTimeoutSeconds(value: string | undefined): number {
  const seconds = Number(value?.trim());
  const valid = Number.isInteger(seconds) && seconds >= MIN_TIMEOUT_SECONDS && seconds <= MAX_TIMEOUT_SECONDS;
  return valid ? seconds : DEFAULT_TIMEOUT_SECONDS;
}
