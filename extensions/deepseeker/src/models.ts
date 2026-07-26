export const DEEPSEEK_FLASH_MODEL = "deepseek-v4-flash";
export const DEEPSEEK_PRO_MODEL = "deepseek-v4-pro";

const LEGACY_MODEL_MIGRATIONS: Record<string, string> = {
  "deepseek-chat": DEEPSEEK_FLASH_MODEL,
  "deepseek-reasoner": DEEPSEEK_PRO_MODEL,
};

export function normalizeDeepSeekModel(model: string): string {
  return LEGACY_MODEL_MIGRATIONS[model] ?? model;
}
