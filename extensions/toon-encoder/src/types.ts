export interface RecentTOON {
  id: string; // UUID
  toon: string; // Encoded TOON
  original: string; // Original JSON/YAML
  format: "json" | "yaml"; // Input format
  timestamp: number; // Unix timestamp
  tokenSavings?: number; // Optional stats
}

export type InputFormat = "json" | "yaml" | "auto";

export interface EncodeResult {
  toon: string;
  format: "json" | "yaml";
  original: string;
  success: boolean;
  error?: string;
}
