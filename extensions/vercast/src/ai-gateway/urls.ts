import { Color, Icon, type Image } from "@raycast/api";
import type { LeaderboardDataset, LeaderboardModality } from "./types";

export const AI_GATEWAY_BASE_URL = "https://ai-gateway.vercel.sh/v1";
export const LEADERBOARD_EXPORT_URL = "https://vercel.com/api/ai/leaderboard-export";
export const AI_GATEWAY_MODEL_PAGE_BASE_URL = "https://vercel.com/ai-gateway/models";
const MODELS_DEV_LOGO_BASE_URL = "https://models.dev/logos";

const PROVIDER_LOGO_ALIASES: Record<string, string> = {
  "aws bedrock": "amazon-bedrock",
  "azure ai": "azure",
  "fireworks ai": "fireworks-ai",
  "google ai studio": "google",
  "google vertex ai": "google-vertex",
  "z.ai": "zai",
};

function modelIdSegments(modelId: string): string[] {
  const segments = modelId
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (segments.length === 0) {
    throw new Error("Model ID must not be empty.");
  }
  return segments;
}

export function getModelCatalogUrl(): string {
  return `${AI_GATEWAY_BASE_URL}/models`;
}

export function getModelEndpointsUrl(modelId: string): string {
  const encodedId = modelIdSegments(modelId).map(encodeURIComponent).join("/");
  return `${AI_GATEWAY_BASE_URL}/models/${encodedId}/endpoints`;
}

export function getLeaderboardUrl(dataset: LeaderboardDataset, modality?: LeaderboardModality): string {
  const params = new URLSearchParams({ dataset });
  if (dataset !== "providers" && modality) {
    params.set("modality", modality);
  }
  return `${LEADERBOARD_EXPORT_URL}?${params.toString()}`;
}

export function getChatCompletionsUrl(): string {
  return `${AI_GATEWAY_BASE_URL}/chat/completions`;
}

export function getModelPageUrl(modelId: string): string {
  const segments = modelIdSegments(modelId);
  const finalModelIdSegment = segments[segments.length - 1];
  return `${AI_GATEWAY_MODEL_PAGE_BASE_URL}/${encodeURIComponent(finalModelIdSegment)}`;
}

export function getProviderLogoUrl(provider: string): string {
  const normalizedProvider = provider.trim().toLocaleLowerCase();
  const logoId =
    PROVIDER_LOGO_ALIASES[normalizedProvider] ??
    normalizedProvider.replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/^-|-$/g, "");
  return `${MODELS_DEV_LOGO_BASE_URL}/${encodeURIComponent(logoId)}.svg`;
}

/** Theme-aware provider logo; models.dev SVGs use currentColor and need PrimaryText tinting. */
export function getProviderIcon(provider: string, fallback: Image.Fallback = Icon.Globe): Image.ImageLike {
  return {
    source: getProviderLogoUrl(provider),
    tintColor: Color.PrimaryText,
    fallback,
  };
}
