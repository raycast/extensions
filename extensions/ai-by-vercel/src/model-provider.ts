import type { AI } from "@raycast/api";
import { jsonSchema, streamText, tool, type ToolSet } from "ai";
import { z } from "zod";
import { createGateway } from "@ai-sdk/gateway";

const catalogSchema = z.object({
  data: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string(),
      description: z.string().nullish(),
      type: z.string(),
      context_window: z.number().nonnegative().nullish(),
      tags: z.array(z.string()).optional(),
      temperature: z.boolean().optional(),
      supported_parameters: z.array(z.string()).optional(),
      modalities: z.object({ input: z.array(z.string()), output: z.array(z.string()) }).optional(),
    }),
  ),
});

export function createModelProvider(options: { apiKey: string; fetch?: typeof fetch }) {
  const fetcher = options.fetch ?? fetch;
  const gateway = createGateway({ apiKey: options.apiKey, fetch: fetcher });
  const getModels: AI.GetModels = async () => {
    // The REST catalog includes context windows and capability tags omitted by SDK discovery.
    const catalog = catalogSchema.parse(
      await fetchCatalog("https://ai-gateway.vercel.sh/v1/models", options.apiKey, fetcher),
    );
    return catalog.data
      .filter(
        (model) =>
          model.type === "language" &&
          (!model.modalities || (model.modalities.output.length === 1 && model.modalities.output[0] === "text")),
      )
      .map(
        (model): AI.RegisteredModel => ({
          id: model.id,
          title: model.name,
          description: model.description ?? undefined,
          icon: "extension-icon.png",
          contextWindow: model.context_window || undefined,
          capabilities: {
            systemMessage: { supported: true },
            streaming: { supported: true },
            temperature: {
              supported: model.temperature ?? model.supported_parameters?.includes("temperature") ?? false,
            },
            tools: { supported: model.tags?.includes("tool-use") ?? false },
            ...(model.tags?.includes("vision")
              ? { vision: { mediaTypes: ["image/png", "image/jpeg", "image/webp"] } }
              : {}),
          },
        }),
      );
  };
  const streamCompletion: AI.StreamCompletion = (model, request) =>
    streamText({
      model: gateway(model.id),
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
