export interface RequestMetadata {
  provider: string;
  total_cost: number;
  model: string;
  latencyMs: number;
  durationS: string;
}

export interface ResultViewConfig {
  prompt: string;
  model_override: string;
  provider_sort?: string;
  toast_title: string;
}
