import { createHmac } from "node:crypto";
import type { AI } from "@raycast/api";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { jsonSchema, streamText, tool, type ToolSet } from "ai";
import { z } from "zod";

const baseURL = "https://router.inference.ai.exchange/v1";
const catalogSchema = z.object({
  data: z.array(
    z.object({
      id: z.string().min(1),
      kind: z.string().optional(),
      modality: z.string().optional(),
      context_length: z.number().nonnegative().optional(),
      liquid_supported_parameters: z.array(z.string()).default([]),
    }),
  ),
});

export function createModelProvider(options: { apiKey: string; fetch?: typeof fetch }) {
  const fetcher = options.fetch ?? fetch;
  const provider = createOpenAICompatible({ name: "liquid", baseURL, apiKey: options.apiKey, fetch: fetcher });

  const getModels: AI.GetModels = async () => {
    const response = await fetcher(`${baseURL}/models?kind=text`, {
      headers: { Authorization: `Bearer ${options.apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error("Model access was denied. Check your Liquid API key in extension preferences.");
      }
      throw new Error(`Could not get Liquid models (HTTP ${response.status}). Try again later.`);
    }
    const catalog = catalogSchema.parse(await response.json());
    return catalog.data
      .filter((model) => (model.kind ?? "chat") === "chat" && (model.modality ?? "text") === "text")
      .map((model): AI.RegisteredModel => ({
        id: model.id,
        title: model.id === "liquid.auto" ? "Liquid Auto" : model.id,
        icon: "extension-icon.png",
        contextWindow: model.context_length || undefined,
        capabilities: {
          systemMessage: { supported: true },
          temperature: { supported: true },
          streaming: { supported: true },
          tools: { supported: model.liquid_supported_parameters.includes("tools") },
          ...(model.liquid_supported_parameters.includes("input.image")
            ? { vision: { mediaTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"] } }
            : {}),
        },
      }));
  };

  const streamCompletion: AI.StreamCompletion = (model, request) => {
    const sessionId = request.providerOptions?.raycast.sessionId;
    // Scope the digest to this API key. Liquid never receives the raw Raycast session ID.
    const sessionKey = sessionId
      ? `raycast:${createHmac("sha256", options.apiKey).update(sessionId).digest("hex")}`
      : undefined;
    return streamText({
      model: provider.chatModel(model.id),
      system: request.system,
      messages: request.messages ?? [],
      temperature: request.temperature,
      tools: toTools(request.tools),
      toolChoice: request.toolChoice,
      headers: sessionKey ? { "x-session-id": sessionKey } : undefined,
      // A retry can create another paid job after the first request reaches Liquid.
      maxRetries: 0,
    });
  };

  return { getModels, streamCompletion };
}

function toTools(tools: AI.ModelToolSet | undefined): ToolSet | undefined {
  if (!tools || Object.keys(tools).length === 0) return undefined;
  // Raycast executes the tools and supplies their results on the next turn.
  return Object.fromEntries(
    Object.entries(tools).map(([name, definition]) => [
      name,
      tool({
        description: definition.description,
        inputSchema: jsonSchema(
          (definition.inputSchema ?? { type: "object", properties: {} }) as Parameters<typeof jsonSchema>[0],
        ),
      }),
    ]),
  );
}
