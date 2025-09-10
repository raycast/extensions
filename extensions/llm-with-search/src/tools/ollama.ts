export type OllamaTagResponse = {
  models?: Array<{
    name: string;
    modified_at?: string;
    size?: number;
    digest?: string;
  }>;
};

export async function listOllamaModels(ollamaBaseUrl: string): Promise<string[]> {
  const base = (ollamaBaseUrl || "http://localhost:11434").replace(/\/$/, "");
  const response = await fetch(`${base}/api/tags`);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to list Ollama models (${response.status}): ${text}`);
  }
  const data = (await response.json()) as OllamaTagResponse;
  const names = (data.models ?? []).map((m) => m.name).filter(Boolean);
  names.sort((a, b) => a.localeCompare(b));
  return names;
}
