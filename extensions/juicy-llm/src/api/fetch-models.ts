import type { Provider, ProviderModel } from "../types";

const TIMEOUT_MS = 10_000;

async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchOpenAIModels(apiKey: string): Promise<ProviderModel[]> {
  const res = await fetchWithTimeout("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`);
  const json = (await res.json()) as { data: { id: string }[] };
  return json.data
    .filter((m) => /^(gpt-|o[134]-|o[134] |chatgpt-)/.test(m.id))
    .map((m) => ({ id: m.id, name: m.id }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

async function fetchAnthropicModels(apiKey: string): Promise<ProviderModel[]> {
  const res = await fetchWithTimeout(
    "https://api.anthropic.com/v1/models?limit=100",
    {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
    },
  );
  if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`);
  const json = (await res.json()) as {
    data: { id: string; display_name?: string }[];
  };
  return json.data
    .map((m) => ({ id: m.id, name: m.display_name ?? m.id }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

async function fetchGoogleModels(apiKey: string): Promise<ProviderModel[]> {
  const res = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=100`,
  );
  if (!res.ok) throw new Error(`Google AI API error: ${res.status}`);
  const json = (await res.json()) as {
    models: {
      name: string;
      displayName: string;
      supportedGenerationMethods: string[];
    }[];
  };
  return json.models
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
    .map((m) => ({ id: m.name.replace("models/", ""), name: m.displayName }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

async function fetchOllamaModels(baseUrl?: string): Promise<ProviderModel[]> {
  const url = baseUrl ?? "http://localhost:11434/api";
  const res = await fetchWithTimeout(`${url}/tags`);
  if (!res.ok) throw new Error(`Ollama API error: ${res.status}`);
  const json = (await res.json()) as { models: { name: string }[] };
  return json.models
    .map((m) => ({ id: m.name, name: m.name }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

async function fetchOpenRouterModels(apiKey: string): Promise<ProviderModel[]> {
  const headers: Record<string, string> = {};
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  const res = await fetchWithTimeout("https://openrouter.ai/api/v1/models", {
    headers,
  });
  if (!res.ok) throw new Error(`OpenRouter API error: ${res.status}`);
  const json = (await res.json()) as { data: { id: string; name: string }[] };
  return json.data
    .map((m) => ({ id: m.id, name: m.name ?? m.id }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export async function fetchModels(
  provider: Provider,
  apiKey: string,
  baseUrl?: string,
): Promise<ProviderModel[]> {
  switch (provider) {
    case "openai":
      return fetchOpenAIModels(apiKey);
    case "anthropic":
      return fetchAnthropicModels(apiKey);
    case "google":
      return fetchGoogleModels(apiKey);
    case "ollama":
      return fetchOllamaModels(baseUrl);
    case "openrouter":
      return fetchOpenRouterModels(apiKey);
  }
}
