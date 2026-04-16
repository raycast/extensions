import { PreferenceValidationError } from "./errors";

function trimOrEmpty(value?: string) {
  return value?.trim() ?? "";
}

export function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/, "");
}

export function validatePreferences(input: {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
}) {
  const baseUrl = trimOrEmpty(input.baseUrl);
  if (!baseUrl) {
    throw new PreferenceValidationError("缺少 Base URL");
  }

  const apiKey = trimOrEmpty(input.apiKey);
  if (!apiKey) {
    throw new PreferenceValidationError("缺少 API Key");
  }

  const model = trimOrEmpty(input.model);
  if (!model) {
    throw new PreferenceValidationError("缺少 Model");
  }

  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  if (!normalizedBaseUrl) {
    throw new PreferenceValidationError("缺少 Base URL");
  }

  return {
    baseUrl: normalizedBaseUrl,
    apiKey,
    model,
  };
}
