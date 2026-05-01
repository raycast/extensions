import { getPreferenceValues } from "@raycast/api";
import { RedactionMode, DetectionPolicy } from "./types";

export interface Preferences {
  defaultMode: RedactionMode;
  defaultPolicy: DetectionPolicy;
  enableAudit: boolean;
}

export function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

export const policyColors = {
  secrets: "#FF6B6B",
  balanced: "#4ECDC4",
  standard: "#45B7D1",
  enhanced: "#96CEB4",
} as const;

export const modeColors = {
  label: "#6C5CE7",
  typed: "#A29BFE",
  indexed: "#74B9FF",
  masked: "#00B894",
} as const;
