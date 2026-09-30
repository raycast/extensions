import type { AI } from "@raycast/api";
import { jsonSchema, streamText, tool, type ToolSet } from "ai";
import { z } from "zod";
import { createCerebras } from "@ai-sdk/cerebras";

const catalogSchema = z.object({ data: z.array(z.object({ id: z.string().min(1), owned_by: z.string().optional() })) });
const metadataSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      deprecated: z.boolean().optional(),
      capabilities: z
        .object({ streaming: z.boolean().optional(), tools: z.boolean().optional(), vision: z.boolean().optional() })
        .optional(),
      supported_parameters: z.object({ temperature: z.boolean().optional() }).optional(),
      limits: z.object({ max_context_length: z.number().nonnegative().nullish() }).optional(),
    }),
  ),
});

export function createModelProvider(options: { apiKey: string; fetch?: typeof fetch }) {
  const fetcher = options.fetch ?? fetch;
  const provider = createCerebras({ apiKey: options.apiKey, fetch: fetcher });
  const getModels: AI.GetModels = async () => {
    const [catalog, metadata] = await Promise.all([
      fetchCatalog("https://api.cerebras.ai/v1/models", options.apiKey, fetcher).then((value) =>
        catalogSchema.parse(value),
      ),
      // Public metadata enriches the authenticated catalog; private models still remain available.
      fetchCatalog("https://api.cerebras.ai/public/v1/models", undefined, fetcher)
        .then((value) => metadataSchema.parse(value).data)
        .catch(() => []),
    ]);
    const byId = new Map(metadata.map((model) => [model.id, model]));
    return catalog.data
      .filter((model) => !byId.get(model.id)?.deprecated)
      .map((model): AI.RegisteredModel => {
        const details = byId.get(model.id);
        return {
          id: model.id,
          title: details?.name ?? model.id,
          description: details?.description ?? model.owned_by,
          icon: "cerebras.png",
          contextWindow: details?.limits?.max_context_length || undefined,
          capabilities: {
            systemMessage: { supported: true },
            streaming: { supported: details?.capabilities?.streaming ?? true },
            temperature: { supported: details?.supported_parameters?.temperature ?? false },
            tools: { supported: details?.capabilities?.tools ?? false },
            ...(details?.capabilities?.vision
              ? { vision: { mediaTypes: ["image/png", "image/jpeg", "image/webp"] } }
              : {}),
          },
        };
      });
  };
  const streamCompletion: AI.StreamCompletion = (model, request) =>
    streamText({
      model: provider(model.id),
      system: request.system,
      messages: request.messages ?? [],
      temperature: model.capabilities?.temperature?.supported ? request.temperature : undefined,
      tools: toAiTools(request.tools),
      toolChoice: request.toolChoice,
      maxRetries: 0,
    });
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
