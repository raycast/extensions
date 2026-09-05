import type { TokenLimitMode } from "./types";

const OPENAI_COMPLETION_TOKEN_MODEL_PATTERN = /^(o1|o3|gpt-5)/i;

export type TokenLimitParams = { max_tokens: number } | { max_completion_tokens: number };

export function inferTokenLimitMode(endpoint: string, model: string): TokenLimitMode {
  try {
    const url = new URL(endpoint);
    if (
      url.protocol === "https:" &&
      url.hostname === "api.openai.com" &&
      OPENAI_COMPLETION_TOKEN_MODEL_PATTERN.test(model)
    ) {
      return "max-completion-tokens";
    }
  } catch {
    // An invalid endpoint is handled by profile validation.
  }
  return "max-tokens";
}

export function getTokenLimitParams(mode: TokenLimitMode, maxTokens: number): TokenLimitParams {
  return mode === "max-completion-tokens" ? { max_completion_tokens: maxTokens } : { max_tokens: maxTokens };
}
