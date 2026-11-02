export const DEFAULT_HISTORY_SIZE = 20;

export const HISTORY_KEYS = { ssn: "history-ssn" };

export function parseHistorySize(enabled: boolean, text: string): number {
  if (!enabled) return 0;
  const size = Number(text);
  return text.trim() !== "" && Number.isInteger(size) && size >= 0 ? size : DEFAULT_HISTORY_SIZE;
}

export function addToHistory(history: string[], value: string, size: number): string[] {
  return [value, ...history.filter((entry) => entry !== value)].slice(0, size + 1);
}
