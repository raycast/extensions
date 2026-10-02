import type { SearchEngine } from "../types";
import { builtinSearchEngines } from "./builtin-search-engines";
import { getCustomSearchEngines } from "./custom-search-engines";

const builtinSearchEnginesByPrimaryTrigger = new Map(
  builtinSearchEngines.map((engine) => [engine.t.toLowerCase(), engine]),
);
const builtinSearchEnginesByTrigger = new Map(builtinSearchEnginesByPrimaryTrigger);

// Register primary triggers first so aliases cannot replace an existing shortcut.
for (const engine of builtinSearchEngines) {
  for (const alias of engine.ts ?? []) {
    const trigger = alias.toLowerCase();
    if (!builtinSearchEnginesByTrigger.has(trigger)) {
      builtinSearchEnginesByTrigger.set(trigger, engine);
    }
  }
}

const builtinAliasesByEngine = new Map(
  builtinSearchEngines.map((engine) => [
    engine,
    (engine.ts ?? []).filter((alias) => builtinSearchEnginesByTrigger.get(alias.toLowerCase()) === engine),
  ]),
);

export const getBuiltinSearchEngine = (trigger: string) => builtinSearchEnginesByTrigger.get(trigger.toLowerCase());

export const getCustomSearchEnginesByTrigger = (
  customSearchEngines: SearchEngine[],
): ReadonlyMap<string, SearchEngine> => new Map(customSearchEngines.map((engine) => [engine.t, engine]));

// An exact custom trigger wins; otherwise aliases inherit their primary's override.
const resolveTrigger = (key: string, customEnginesByTrigger: ReadonlyMap<string, SearchEngine>) => {
  const customEngine = customEnginesByTrigger.get(key);
  if (customEngine) return customEngine;

  const builtinEngine = builtinSearchEnginesByTrigger.get(key);
  return builtinEngine && (customEnginesByTrigger.get(builtinEngine.t.toLowerCase()) ?? builtinEngine);
};

// Saved defaults refer to primary triggers, not aliases that may outlive a custom engine.
export const getPrimarySearchEngine = (trigger: string | undefined, customSearchEngines?: SearchEngine[]) => {
  if (!trigger) return undefined;

  const key = trigger.toLowerCase();
  const customEngines = customSearchEngines ?? getCustomSearchEngines();
  return customEngines.find((engine) => engine.t === key) || builtinSearchEnginesByPrimaryTrigger.get(key);
};

export const getSearchEngine = (trigger?: string, customSearchEngines?: SearchEngine[]) => {
  if (!trigger) return undefined;

  const customEngines = customSearchEngines ?? getCustomSearchEngines();
  return resolveTrigger(trigger.toLowerCase(), getCustomSearchEnginesByTrigger(customEngines));
};

export const getEffectiveAliases = (
  engine: SearchEngine,
  customEnginesByTrigger: ReadonlyMap<string, SearchEngine>,
) => {
  const builtinEngine = builtinSearchEnginesByPrimaryTrigger.get(engine.t.toLowerCase());
  if (!builtinEngine || resolveTrigger(builtinEngine.t.toLowerCase(), customEnginesByTrigger) !== engine) return [];

  return (builtinAliasesByEngine.get(builtinEngine) ?? []).filter(
    (alias) => resolveTrigger(alias.toLowerCase(), customEnginesByTrigger) === engine,
  );
};

export const getEffectiveSearchEngines = (customSearchEngines: SearchEngine[]) => {
  const customTriggers = new Set(customSearchEngines.map((engine) => engine.t));
  return [...customSearchEngines, ...builtinSearchEngines.filter((engine) => !customTriggers.has(engine.t))];
};
