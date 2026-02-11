/** Unit for progress metric display */
export type ProgressUnit = "percent" | "dollars";

/** A single metric line from a provider */
export type MetricLine =
  | { type: "text"; label: string; value: string; subtitle?: string }
  | { type: "progress"; label: string; value: number; max: number; unit?: ProgressUnit; subtitle?: string }
  | { type: "badge"; label: string; text: string; subtitle?: string };

/** Result from fetching a provider's usage data */
export interface ProviderResult {
  id: string;
  name: string;
  lines?: MetricLine[];
  error?: string;
}

/** Provider configuration for fetching */
export interface ProviderConfig {
  id: string;
  name: string;
  enabled: boolean;
  fetch: () => Promise<MetricLine[]>;
}
