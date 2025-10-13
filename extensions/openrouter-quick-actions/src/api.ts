import { getPreferenceValues } from "@raycast/api";
import OpenAI from "openai";

const preferences = getPreferenceValues();

export const openai = new OpenAI({
  apiKey: preferences.apikey,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "https://github.com/raycast/extensions/tree/main/extensions/openrouter-quick-actions",
    "X-Title": "OpenRouter Quick Actions",
  },
});

export const getGlobalModel = () => {
  return getPreferenceValues().model;
};

type CompletionMetadata = {
  created_at: string;
  model: string;
  app_id: number;
  external_user: string | null;
  streamed: boolean;
  cancelled: boolean;
  latency: number;
  moderation_latency: number | null;
  generation_time: number;
  tokens_prompt: number;
  tokens_completion: number;
  native_tokens_prompt: number;
  native_tokens_completion: number;
  native_tokens_reasoning: number;
  native_tokens_cached: number;
  num_media_prompt: number | null;
  num_media_completion: number | null;
  num_search_results: number | null;
  origin: string;
  is_byok: boolean;
  finish_reason: string;
  native_finish_reason: string;
  usage: number;
  api_type: string;
  id: string;
  upstream_id: string;
  total_cost: number;
  cache_discount: number | null;
  upstream_inference_cost: number;
  provider_name: string;
};

export const getCompletionMetadata = async (completionId: string): Promise<CompletionMetadata | null> => {
  const apiKey = preferences.apikey;
  const url = `https://openrouter.ai/api/v1/generation?id=${completionId}`;

  const options = { method: "GET", headers: { Authorization: `Bearer ${apiKey}` } };

  try {
    const response = await fetch(url, options);
    const json = (await response.json()) as { data: CompletionMetadata };

    return json.data;
  } catch (error) {
    console.error(error);
    return null;
  }
};
