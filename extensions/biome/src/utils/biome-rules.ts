// Re-export types and fallback rules
export { useBiomeRules } from "../hooks/use-biome-rules";
export { biomeRulesFallback } from "../fallback/biome-rules-fallback";
export {
  getCategoryRules,
  searchRules,
  getCategories,
} from "../fallback/biome-rules-fallback";
export type { BiomeRule } from "../types/biome-schema";
