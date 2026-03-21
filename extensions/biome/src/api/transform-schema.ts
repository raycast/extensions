import { BiomeSchema, BiomeRule } from "../types/biome-schema";
import ruleVersionsJson from "../data/rules-versions.json";
import ruleMetadataJson from "../data/rules-metadata.json";
import { compareVersions } from "../utils/version";
import { camelToKebab } from "../utils/string";

type RuleVersionMap = Record<string, string>;
type RuleMetadataMap = Record<
  string,
  { recommended: boolean; fixable: boolean }
>;

const ruleVersionMap: RuleVersionMap = ruleVersionsJson;
const ruleMetadataMap: RuleMetadataMap = ruleMetadataJson;

export function transformSchemaToRules(
  schema: BiomeSchema,
  version: string,
): BiomeRule[] {
  const rules: BiomeRule[] = [];

  const defs = schema.$defs as Record<
    string,
    { properties?: Record<string, { description?: string }> }
  >;

  if (!defs) {
    throw new Error("Invalid schema structure: $defs not found");
  }

  // Map category names from schema ($defs keys) to display names
  const categoryMap: Record<string, BiomeRule["category"]> = {
    A11y: "A11y",
    Complexity: "Complexity",
    Correctness: "Correctness",
    Nursery: "Nursery",
    Performance: "Performance",
    Security: "Security",
    Style: "Style",
    Suspicious: "Suspicious",
  };

  // Process each category from $defs
  for (const [categoryKey, categoryDef] of Object.entries(defs)) {
    const category = categoryMap[categoryKey];

    // Skip if not a rule category or doesn't have properties
    if (!category || !categoryDef.properties) {
      continue;
    }

    for (const [ruleId, ruleSchema] of Object.entries(categoryDef.properties)) {
      // Skip "recommended" - it's not a rule, it's a config option
      if (ruleId === "recommended") continue;

      const description = ruleSchema.description || "No description available";

      // Get metadata from static JSON (recommended and fixable)
      const metadata = ruleMetadataMap[ruleId] || {
        recommended: true,
        fixable: false,
      };

      rules.push({
        id: ruleId,
        name: camelToKebab(ruleId),
        category,
        description,
        recommended: metadata.recommended,
        fixable: metadata.fixable,
        docUrl: `https://biomejs.dev/linter/rules/${categoryKey.toLowerCase()}/${camelToKebab(ruleId)}/`,
        version: ruleVersionMap[ruleId] || version,
      });
    }
  }

  const sorted = rules.sort((a, b) => {
    // Sort purely by version descending (newest first), ignoring category
    const versionCompare = compareVersions(b.version || "", a.version || "");
    if (versionCompare !== 0) return versionCompare;
    // Then by name alphabetically
    return a.name.localeCompare(b.name);
  });

  // Log metadata coverage
  const withNonRecommended = sorted.filter((r) => !r.recommended).length;
  console.log(
    `Transformed ${sorted.length} rules (${withNonRecommended} with recommended: false)`,
  );

  return sorted;
}
