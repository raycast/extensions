export const DEFAULT_MODEL_OPTION = "gpt-6-luna";

export function isModelId(model: string): boolean {
  return model.trim().length > 0 && !/\s/.test(model);
}

export function normalizeAvailableOptions(availableOptions?: string[]): string[] {
  const seen = new Set<string>();
  return (availableOptions ?? []).filter((option) => {
    const id = option.trim();
    if (!isModelId(id) || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function resolveModelOption(option: string, availableOptions?: string[]): string {
  const options = normalizeAvailableOptions(availableOptions);
  const id = option.trim();
  return options.includes(id)
    ? id
    : options.includes(DEFAULT_MODEL_OPTION)
      ? DEFAULT_MODEL_OPTION
      : (options[0] ?? DEFAULT_MODEL_OPTION);
}
