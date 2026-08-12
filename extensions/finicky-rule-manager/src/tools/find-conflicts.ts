import { loadRules } from "../storage";

/**
 * Find and list conflicting rules that match similar URL patterns
 */
export default async function tool() {
  const rules = await loadRules();
  const enabledRules = rules.filter((r) => r.enabled);

  if (enabledRules.length < 2) {
    return "No conflicts possible - you need at least 2 enabled rules to have conflicts.";
  }

  const conflicts: Array<{ rule1: string; rule2: string; reason: string }> = [];

  for (let i = 0; i < enabledRules.length; i++) {
    for (let j = i + 1; j < enabledRules.length; j++) {
      const rule1 = enabledRules[i];
      const rule2 = enabledRules[j];

      // Check for pattern overlaps
      const overlappingPatterns: string[] = [];

      rule1.patterns.forEach((pattern1) => {
        rule2.patterns.forEach((pattern2) => {
          if (rule1.matchType === "wildcards" && rule2.matchType === "wildcards") {
            // Extract domain from wildcard patterns
            const domain1 = pattern1.match(/\/\/([^/]+)/)?.[1]?.replace(/^\*\./, "");
            const domain2 = pattern2.match(/\/\/([^/]+)/)?.[1]?.replace(/^\*\./, "");

            if (domain1 && domain2 && domain1 === domain2) {
              overlappingPatterns.push(`${pattern1} ≈ ${pattern2}`);
            }
          } else if (pattern1 === pattern2) {
            overlappingPatterns.push(pattern1);
          }
        });
      });

      if (overlappingPatterns.length > 0) {
        conflicts.push({
          rule1: `${rule1.name} → ${rule1.browser}`,
          rule2: `${rule2.name} → ${rule2.browser}`,
          reason: `Overlapping patterns: ${overlappingPatterns.join(", ")}`,
        });
      }
    }
  }

  if (conflicts.length === 0) {
    return "✓ No conflicts found! All rules have unique patterns.";
  }

  const conflictList = conflicts
    .map(
      (c, i) => `${i + 1}. Conflict between:
   - ${c.rule1}
   - ${c.rule2}
   Reason: ${c.reason}`,
    )
    .join("\n\n");

  return `⚠️ Found ${conflicts.length} conflict(s):\n\n${conflictList}\n\nTo resolve conflicts, you can:\n- Disable one of the conflicting rules\n- Update patterns to be more specific\n- Delete duplicate rules`;
}
