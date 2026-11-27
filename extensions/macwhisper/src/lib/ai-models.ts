import { AI } from "@raycast/api";

export type AIModelOption = { value: AI.Model; title: string };
export type AIModelSection = { provider: string; models: AIModelOption[] };

/**
 * Raycast AI models grouped by provider. `AI.Model` also lists deprecated aliases that point at the same model,
 * so entries are de-duplicated by value and the first (current) name wins.
 */
export const AI_MODEL_SECTIONS: AIModelSection[] = (() => {
  const seen = new Set<string>();
  const sections = new Map<string, AIModelOption[]>();
  for (const [key, value] of Object.entries(AI.Model)) {
    if (seen.has(value)) continue;
    seen.add(value);
    const [provider, ...name] = key.split("_");
    const models = sections.get(provider) ?? [];
    models.push({ value, title: name.join(" ") || provider });
    sections.set(provider, models);
  }
  return [...sections].map(([provider, models]) => ({ provider, models }));
})();
