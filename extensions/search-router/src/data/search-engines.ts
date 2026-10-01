import type { SearchEngine } from "../types";
import { builtinSearchEngines } from "./builtin-search-engines";
import { getCustomSearchEngine } from "./custom-search-engines";

const builtinSearchEnginesByTrigger = new Map(builtinSearchEngines.map((engine) => [engine.t, engine]));

export const getBuiltinSearchEngine = (trigger: string) => builtinSearchEnginesByTrigger.get(trigger);

export const getSearchEngine = (trigger?: string) =>
  trigger ? getCustomSearchEngine(trigger.toLowerCase()) || getBuiltinSearchEngine(trigger.toLowerCase()) : undefined;

export const getEffectiveSearchEngines = (customSearchEngines: SearchEngine[]) => {
  const customTriggers = new Set(customSearchEngines.map((engine) => engine.t));
  return [...customSearchEngines, ...builtinSearchEngines.filter((engine) => !customTriggers.has(engine.t))];
};
