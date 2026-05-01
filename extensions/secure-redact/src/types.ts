export type RedactionMode = "label" | "typed" | "indexed" | "masked";

export type DetectionPolicy = "secrets" | "balanced" | "standard" | "enhanced";

export interface Detection {
  type: string;
  value: string;
  start: number;
  end: number;
  confidence: number;
}

export interface RedactionResult {
  text: string;
  detections: Detection[];
  redactedCount: number;
}

export interface PatternDefinition {
  name: string;
  pattern: RegExp;
  validator?: (value: string) => boolean;
  category: "secrets" | "personal" | "financial" | "network" | "system";
  description: string;
}

export interface AuditEntry {
  id: string;
  timestamp: number;
  redactedCount: number;
  detectionTypes: string[];
  mode: RedactionMode;
  policy: DetectionPolicy;
  inputLength: number;
  outputLength: number;
}

export interface ThreatFeed {
  id: string;
  name: string;
  patterns: string[];
  enabled: boolean;
  created: number;
  modified: number;
}
