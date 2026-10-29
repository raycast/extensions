import type { AI } from "@raycast/api";
import { jsonSchema, streamText, tool, type ToolSet } from "ai";
import { z } from "zod";
import { createGroq } from "@ai-sdk/groq";

const catalogSchema = z.object({
  data: z.array(
    z.object({
      id: z.string().min(1),
      owned_by: z.string().optional(),
      active: z.boolean().optional(),
      context_window: z.number().nonnegative().nullish(),
    }),
  ),
});

export function createModelProvider(options: { apiKey: string; fetch?: typeof fetch }) {
  const fetcher = options.fetch ?? fetch;
  const provider = createGroq({ apiKey: options.apiKey, fetch: fetcher });
  const getModels: AI.GetModels = async () => {
    const catalog = catalogSchema.parse(
      await fetchCatalog("https://api.groq.com/openai/v1/models", options.apiKey, fetcher),
    );
    // Groq's catalog has no modality field and includes speech and safety classifiers.
    return catalog.data
      .filter((model) => model.active !== false && !/whisper|tts|orpheus|guard/i.test(model.id))
      .map(
        (model): AI.RegisteredModel => ({
          id: model.id,
          title: model.id,
          description: model.owned_by,
          icon: "groq.png",
          contextWindow: model.context_window || undefined,
          capabilities: {
            systemMessage: { supported: true },
            temperature: { supported: true },
            streaming: { supported: true },
            // Compound executes its own tools and does not accept client tool definitions.
            tools: { supported: !model.id.startsWith("groq/compound") },
            ...([
              "meta-llama/llama-4-scout-17b-16e-instruct",
              "meta-llama/llama-4-maverick-17b-128e-instruct",
              "qwen/qwen3.6-27b",
              "qwen/qwen3.8-27b",
            ].includes(model.id)
              ? {
                  vision: { mediaTypes: ["image/png", "image/jpeg", "image/webp"] },
                }
              : {}),
            ...(["openai/gpt-oss-20b", "openai/gpt-oss-120b"].includes(model.id)
              ? {
                  reasoningEffort: { supported: true, options: ["low", "medium", "high"], default: "medium" },
                }
              : {}),
          },
        }),
      );
  };
  const streamCompletion: AI.StreamCompletion = (model, request) => {
    const effort = request.providerOptions?.raycast.reasoningEffort;
    return streamText({
      model: provider(model.id),
      system: request.system,
      messages: request.messages ?? [],
      temperature: request.temperature,
      tools: toAiTools(request.tools),
      toolChoice: request.toolChoice,
      maxRetries: 0,
      ...(effort && model.capabilities?.reasoningEffort?.options.includes(effort)
        ? { providerOptions: { groq: { reasoningEffort: effort } } }
        : {}),
    });
  };
  return { getModels, streamCompletion };
}

function toAiTools(tools: AI.ModelToolSet | undefined): ToolSet | undefined {
  if (!tools || Object.keys(tools).length === 0) return undefined;
  // Raycast executes tools and supplies their results on the next request.
  return Object.fromEntries(
    Object.entries(tools).map(([name, definition]) => [
      name,
      tool({
        description: definition.description,
        inputSchema: jsonSchema((definition.inputSchema ?? {}) as Parameters<typeof jsonSchema>[0]),
      }),
    ]),
  );
}

async function fetchCatalog(url: string, apiKey: string | undefined, fetcher: typeof fetch) {
  const response = await fetcher(url, {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Model discovery was denied. Check your API key and model access in extension preferences.");
    }
    throw new Error(`Could not fetch models (HTTP ${response.status}). Try refreshing models again.`);
  }
  return response.json();
}
