import { queryModels } from "../lib/query-models";

type Input = {
  /** Text matched against model ID, name, description, family, provider ID, and provider name. Use an empty string for filter-only queries. */
  query: string;
  /** Exact provider ID or name, for example "anthropic" or "Anthropic". */
  provider?: string;
  /** Required capabilities, combined with AND semantics. Set each required capability to true. */
  capabilities?: {
    reasoning?: boolean;
    tool_call?: boolean;
    vision?: boolean;
    audio?: boolean;
    video?: boolean;
    pdf?: boolean;
    structured_output?: boolean;
    open_weights?: boolean;
  };
  /** Maximum input price in USD per million tokens. */
  max_input_price?: number;
  /** Maximum output price in USD per million tokens. */
  max_output_price?: number;
  /** Minimum context-window size in tokens. */
  min_context?: number;
  /** Include deprecated models. Defaults to false. */
  include_deprecated?: boolean;
  /** Filter by lifecycle status. Stable means models without an alpha, beta, or deprecated status. */
  status?: "stable" | "alpha" | "beta" | "deprecated";
  /** Result order. Prices sort low to high; context and release date sort high to low. */
  sort?: "provider" | "name" | "input-price" | "output-price" | "context" | "release-date";
  /** Maximum results. Defaults to 10 and is clamped between 1 and 50. */
  limit?: number;
};

/**
 * Search and filter the current models.dev catalog. Returns model capabilities, modalities, pricing, limits, and metadata.
 */
export default async function tool(input: Input) {
  const capabilities = input.capabilities
    ? Object.entries(input.capabilities)
        .filter(([, required]) => required)
        .map(([capability]) => capability)
    : undefined;

  return queryModels({
    query: input.query,
    provider: input.provider,
    capabilities,
    maxInputPrice: input.max_input_price,
    maxOutputPrice: input.max_output_price,
    minContext: input.min_context,
    includeDeprecated: input.include_deprecated,
    status: input.status,
    sort: input.sort,
    limit: input.limit,
  });
}
