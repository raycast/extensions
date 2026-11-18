import type { AI } from "@raycast/api";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { jsonSchema, streamText, tool, type ToolSet } from "ai";
import { BASE_URL, displayName, fetchCatalog } from "./catalog";

const REASONING_EFFORTS = ["low", "medium", "high"];

export function createModelProvider(options: { apiKey: string; fetch?: typeof fetch }) {
  const fetcher = options.fetch ?? fetch;
  const provider = createOpenAICompatible({
    name: "obscurify",
    baseURL: BASE_URL,
    apiKey: options.apiKey,
    fetch: fetcher,
  });

  const getModels: AI.GetModels = async () => {
    const catalog = await fetchCatalog(options.apiKey, fetcher);
    return catalog.map((model): AI.RegisteredModel => ({
      id: model.id,
      title: displayName(model),
      description: model.id,
      icon: "icon.png",
      contextWindow: model.context_length || undefined,
      capabilities: {
        systemMessage: { supported: true },
        temperature: { supported: true },
        streaming: { supported: true },
        tools: { supported: model.tools === true },
        // Models without reasoning ignore the setting, so it is offered everywhere.
        reasoningEffort: { supported: true, options: REASONING_EFFORTS, default: "medium" },
      },
    }));
  };

  const streamCompletion: AI.StreamCompletion = (model, request) => {
    const effort = request.providerOptions?.raycast?.reasoningEffort;
    return streamText({
      model: provider.chatModel(model.id),
      system: request.system,
      messages: request.messages ?? [],
      temperature: request.temperature,
      tools: toAiTools(request.tools),
      toolChoice: request.toolChoice,
      maxRetries: 0,
      ...(effort && REASONING_EFFORTS.includes(effort)
        ? { providerOptions: { obscurify: { reasoningEffort: effort } } }
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
