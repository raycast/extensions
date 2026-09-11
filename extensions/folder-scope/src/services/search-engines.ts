import type { EngineChoice } from "../types/preferences.ts";
import type { SearchEngine, SearchEngineType } from "../types/search.ts";
import { createBundledRipgrepEngine } from "./bundled-ripgrep";
import { FallbackEngine } from "./fallback-engine.ts";
import { engineChain } from "./search-engine-resolver.ts";
import { createSystemRipgrepEngine } from "./system-ripgrep";

const FACTORIES: Record<SearchEngineType, () => SearchEngine> = {
  "bundled-ripgrep": createBundledRipgrepEngine,
  "system-ripgrep": createSystemRipgrepEngine,
  "node-fallback": () => new FallbackEngine(),
};

/** Engine instances in fallback order for the user's preference; feed to `searchWithFallback`. */
export function createSearchEngines(preference: EngineChoice): SearchEngine[] {
  return engineChain(preference).map((type) => FACTORIES[type]());
}
