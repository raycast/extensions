// Shared types for the AI Stats Raycast extension
export type Model = {
  id: string;
  name: string | null;
  slug: string | null;
  creator_name: string | null;
  creator_slug: string | null;
  aa_intelligence_index: number | null;
  aa_coding_index: number | null;
  aa_math_index: number | null;
  mmlu_pro: number | null;
  gpqa: number | null;
  livecodebench: number | null;
  scicode: number | null;
  math_500: number | null;
  aime: number | null;
  hle: number | null;
  median_output_tokens_per_second: number | null;
  median_time_to_first_token_seconds: number | null;
  price_1m_input_tokens: number | null;
  price_1m_output_tokens: number | null;
  price_1m_blended_3_to_1: number | null;
  pricing: unknown | null;
  evaluations: unknown | null;
  first_seen: string;
  last_seen: string;
};
