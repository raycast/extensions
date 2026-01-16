// Arena types
export interface VariantMetadata {
  model_name: string;
  organization: string;
}

export interface ArenaModel {
  variant_id: string;
  variant_key: string;
  variant_metadata: VariantMetadata;
  mu: number;
  sigma: number;
  conservative_rating?: number;
  percent_gain?: number;
  matches_played: number;
  wins: number;
  win_rate: number;
  created_at: string;
  updated_at: string;
  model_id: string;
  model_name: string;
  organization: string;
  announcement_date: string | null;
  throughput_cps: number | null;
  input_price: number | null;
  output_price: number | null;
  license: string | null;
  is_open_source: boolean;
}

export interface ArenaLeaderboardResponse {
  leaderboard: ArenaModel[];
  total_count: number;
  limit: number;
  offset: number;
}

// Category types
export interface Category {
  category_id: string;
  name: string;
  description: string;
  sort_order: number;
}

// Benchmark types
export interface BenchmarkModel {
  rank: number;
  model_id: string;
  model_name: string;
  organization_name: string;
  benchmark_score: number;
  normalized_score: number | null;
  verified: boolean;
}

export interface Benchmark {
  benchmark_id: string;
  name: string;
  description: string;
  modality: string;
  max_score: number;
  verified: boolean;
  model_count: number;
  top_models: BenchmarkModel[];
}

export interface CategoryLeaderboardResponse {
  category: Category;
  benchmarks: Benchmark[];
}

// Model info types
export interface Organization {
  id: string;
  name: string;
  website: string | null;
}

export interface License {
  name: string;
  allow_commercial: boolean;
}

export interface ModelSources {
  api_ref: string | null;
  playground: string | null;
  paper: string | null;
  scorecard_blog: string | null;
  repo: string | null;
  weights: string | null;
}

export interface ModelBenchmark {
  benchmark_id: string;
  name: string;
  description: string;
  categories: string[];
  modality: string;
  max_score: number;
  score: number;
  normalized_score: number | null;
  verified: boolean;
  self_reported: boolean;
  self_reported_source: string | null;
  analysis_method: string | null;
  verification_date: string | null;
  verification_notes: string | null;
}

export interface ProviderPricing {
  input_per_million: number;
  output_per_million: number;
}

export interface ProviderLimits {
  max_input_tokens: number;
  max_output_tokens: number;
}

export interface ProviderPerformance {
  throughput: string;
  latency: string;
}

export interface ProviderFeatures {
  web_search: boolean | null;
  function_calling: boolean | null;
  structured_output: boolean | null;
  code_execution: boolean | null;
  batch_inference: boolean | null;
  finetuning: boolean | null;
}

export interface ProviderModalities {
  input: {
    text: boolean;
    image: boolean;
    audio: boolean;
    video: boolean;
  };
  output: {
    text: boolean;
    image: boolean;
    audio: boolean;
    video: boolean;
  };
}

export interface Provider {
  provider_id: string;
  name: string;
  website: string | null;
  deprecated: boolean;
  deprecated_at: string | null;
  pricing: ProviderPricing;
  quantization: string | null;
  limits: ProviderLimits;
  performance: ProviderPerformance;
  features: ProviderFeatures;
  modalities: ProviderModalities;
}

export interface ComparisonModelBenchmarks {
  [benchmarkId: string]: number;
}

export interface ComparisonModelProvider {
  name: string;
  input_cost: number;
  output_cost: number;
  max_input_tokens: number;
  max_output_tokens: number;
  modalities: ProviderModalities;
}

export interface ComparisonModel {
  model_id: string;
  name: string;
  organization_name: string;
  release_date: string;
  announcement_date: string;
  knowledge_cutoff: string | null;
  param_count: number | null;
  multimodal: boolean;
  license: License;
  benchmarks: ComparisonModelBenchmarks;
  provider: ComparisonModelProvider;
}

export interface ModelListItemBenchmark {
  dataset_name: string;
  score: number;
  is_self_reported: boolean;
  analysis_method: string | null;
  date_recorded: string | null;
  source_link: string | null;
}

export interface ModelListItem {
  model_id: string;
  name: string;
  organization_id: string;
  organization: string;
  params: number | null;
  context: number | null;
  release_date: string | null;
  announcement_date: string | null;
  license: string | null;
  multimodal: boolean | null;
  price: string | null;
  throughput: string | null;
  latency: string | null;
  price_per_input_token: string | null;
  price_per_output_token: string | null;
  benchmarks: ModelListItemBenchmark[];
}

export interface ModelInfo {
  model_id: string;
  name: string;
  organization: Organization;
  description: string;
  release_date: string;
  announcement_date: string;
  multimodal: boolean;
  knowledge_cutoff: string | null;
  param_count: number | null;
  training_tokens: number | null;
  available_in_zeroeval: boolean;
  reviews_count: number;
  reviews_avg_rating: number;
  license: License;
  model_family: string | null;
  fine_tuned_from: string | null;
  tags: string[] | null;
  sources: ModelSources;
  benchmarks: ModelBenchmark[];
  providers: Provider[];
  comparison_model: ComparisonModel | null;
}
