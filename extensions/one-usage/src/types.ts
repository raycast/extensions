export type ProgressUnit = "percent" | "dollars";

export type MetricLine =
  | { type: "text"; label: string; value: string; subtitle?: string }
  | { type: "progress"; label: string; value: number; max: number; unit?: ProgressUnit; subtitle?: string }
  | { type: "badge"; label: string; text: string; subtitle?: string };

export interface ProviderResult {
  id: string;
  name: string;
  lines?: MetricLine[];
  error?: string;
}
