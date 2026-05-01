import { DetectionPolicy } from "../types";

export const policyHierarchy: Record<DetectionPolicy, string[]> = {
  secrets: ["secrets"],
  balanced: ["secrets", "personal"],
  standard: ["secrets", "personal", "financial"],
  enhanced: ["secrets", "personal", "financial", "network", "system"],
};

export function getPolicyCategories(policy: DetectionPolicy): string[] {
  return policyHierarchy[policy];
}
