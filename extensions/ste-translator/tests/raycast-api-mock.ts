// Minimal stand-in for @raycast/api so service modules can load under Vitest.
export const AI = {
  ask: () => Promise.reject(new Error("AI.ask mock not configured")),
  Model: { "Anthropic_Claude_4.6_Sonnet": "anthropic-claude-sonnet-4-6" },
};
export const environment = { canAccess: (_api: unknown) => true };
export function getPreferenceValues<T>(): T {
  return {} as T;
}
