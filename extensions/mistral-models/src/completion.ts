import { createMistral } from "@ai-sdk/mistral";
import type { AI } from "@raycast/api";
import { jsonSchema, streamText, type ToolSet } from "ai";
import { mistralFetch } from "./mistral-fetch";
import { completionGuard } from "./completion-guard";

export function complete(
  model: AI.RegisteredModel,
  request: AI.ModelRequest,
  apiKey: string,
  options: { maxRetries?: number; abortSignal?: AbortSignal; guard?: boolean } = {},
) {
  if (!apiKey.trim()) {
    throw new Error("Add your Mistral API key in the Mistral Provider extension preferences.");
  }

  const tools: ToolSet | undefined = request.tools
    ? Object.fromEntries(
        Object.entries(request.tools).map(([name, tool]) => [
          name,
          {
            description: tool.description,
            inputSchema: jsonSchema(
              (tool.inputSchema ?? { type: "object", properties: {} }) as Parameters<typeof jsonSchema>[0],
            ),
          },
        ]),
      )
    : undefined;

  const reasoning = model.capabilities?.reasoningEffort;
  const effort = request.providerOptions?.raycast?.reasoningEffort ?? reasoning?.default;
  if (reasoning?.supported && effort !== undefined && !reasoning.options.includes(effort)) {
    throw new Error(`Unsupported reasoning effort: ${effort}`);
  }

  return streamText({
    // Bun's test types add fetch.preconnect; the SDK only needs the standard callable fetch contract.
    model: createMistral({ apiKey: apiKey.trim(), fetch: mistralFetch as typeof fetch })(model.id),
    system: request.system,
    messages: request.messages ?? [],
    temperature: model.capabilities?.temperature?.supported ? request.temperature : undefined,
    tools,
    toolChoice: request.toolChoice,
    providerOptions: reasoning?.supported && effort ? { mistral: { reasoningEffort: effort } } : undefined,
    // Raycast owns the tool execution loop and subsequent turns.
    maxRetries: options.maxRetries ?? 0,
    abortSignal: options.abortSignal,
    experimental_transform: options.guard === false ? undefined : completionGuard,
    timeout: { totalMs: 600000, chunkMs: 120000 },
    // Raycast receives error stream parts. Avoid logging prompts in SDK errors.
    onError: () => {},
  });
}
