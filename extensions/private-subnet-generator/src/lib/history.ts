export const DEFAULT_HISTORY_SIZE = 20;

export const HISTORY_KEYS = { ipv4: "history-ipv4", ipv6: "history-ipv6" };

export function parseHistorySize(enabled: boolean, text: string): number {
  if (!enabled) return 0;
  const size = Number(text);
  return text.trim() !== "" && Number.isInteger(size) && size >= 0 ? size : DEFAULT_HISTORY_SIZE;
}

export function addToHistory(history: string[], prefix: string, size: number): string[] {
  return [prefix, ...history.filter((entry) => entry !== prefix)].slice(0, size + 1);
}
