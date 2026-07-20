export const STORAGE_KEYS = {
  STACKS_PREFIX: "stacks",
} as const;

export const FILE_NAMES = {
  CAPTURES_JSON: "captures.json",
  CAPTURES_DIR: "captures",
} as const;

export const AI_CONFIG = {
  MODEL: "gpt-5-mini",
  SCREENSHOT_TIMEOUT_MS: 20_000,
} as const;

export const DATE_FORMATS = {
  DISPLAY: { year: "numeric", month: "long", day: "numeric" } as const,
  TIME: { hour: "2-digit", minute: "2-digit" } as const,
} as const;
