import type { LeaderboardSnapshot, Model } from "../src/lib/models";

export const NOW = Date.UTC(2026, 9, 17, 8);

export function model(overrides: Partial<Model> = {}): Model {
  return {
    id: "model-alpha",
    name: "Alpha (High)",
    slug: "alpha-high",
    creator: "Example Lab",
    creatorId: "example-lab",
    intelligence: 50,
    coding: 42,
    inputPrice: 0.25,
    outputPrice: 1.5,
    speed: 150.5,
    latency: 0.65,
    ...overrides,
  };
}

export function apiModel(id = "model-alpha", intelligence: unknown = 50) {
  return {
    id,
    name: `Example ${id}`,
    slug: id,
    model_creator: { id: "example-lab", name: "Example Lab" },
    evaluations: { artificial_analysis_intelligence_index: intelligence, artificial_analysis_coding_index: 42 },
    pricing: { price_1m_input_tokens: 0.25, price_1m_output_tokens: 1.5 },
    performance: { median_output_tokens_per_second: 150.5, median_time_to_first_token_seconds: 0.65 },
  };
}

export function page(data: unknown[] = [apiModel()], current = 1, total = 1) {
  return {
    tier: "free",
    intelligence_index_version: 4.3,
    pagination: { page: current, page_size: 200, total_pages: total, has_more: current < total },
    data,
  };
}

export function snapshot(overrides: Partial<LeaderboardSnapshot> = {}): LeaderboardSnapshot {
  return { indexVersion: 4.3, fetchedAt: NOW, models: [model()], ...overrides };
}
