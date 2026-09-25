import { Color, getPreferenceValues, type AI } from "@raycast/api";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { jsonSchema, streamText, tool, type ToolSet } from "ai";
import { loadModels, type ConsoleModel } from "./console";

export const getModels: AI.GetModels = async () => {
  const models = await loadModels(getPreferenceValues<Preferences>().apiKey);
  return models.map((model) => ({
    id: model.id,
    title: model.title,
    description: model.price && `$${model.price.input} in · $${model.price.output} out per 1M tokens`,
    icon: model.lab
      ? { source: `https://models.dev/logos/${model.lab}.svg`, tintColor: Color.PrimaryText }
      : "extension-icon.png",
    contextWindow: model.contextWindow,
    capabilities: {
      systemMessage: { supported: true },
      temperature: { supported: model.temperature },
      streaming: { supported: true },
      tools: { supported: model.tools },
      ...(model.vision ? { vision: { mediaTypes: ["image/png", "image/jpeg", "image/webp"] } } : {}),
    },
  }));
};

export const streamCompletion: AI.StreamCompletion = async (registered, request) => {
  const apiKey = getPreferenceValues<Preferences>().apiKey;
  const model = (await loadModels(apiKey)).find((entry) => entry.id === registered.id);
  if (!model) throw new Error(`${registered.title} is no longer available in your OpenCode workspace.`);
  return streamText({
    model: languageModel(model, apiKey),
    system: request.system,
    messages: request.messages ?? [],
    temperature: model.temperature ? request.temperature : undefined,
    tools: toTools(request.tools),
    toolChoice: request.toolChoice,
    maxRetries: 0,
  });
};

function languageModel(model: ConsoleModel, apiKey: string) {
  const settings = { baseURL: model.baseURL, apiKey, headers: model.headers };
  if (model.package === "@ai-sdk/anthropic") return createAnthropic(settings)(model.apiModelID);
  if (model.package === "@ai-sdk/openai") return createOpenAI(settings).responses(model.apiModelID);
  if (model.package === "@ai-sdk/google") return createGoogleGenerativeAI(settings)(model.apiModelID);
  return createOpenAICompatible({ ...settings, name: "opencode" })(model.apiModelID);
}

function toTools(tools: AI.ModelToolSet | undefined): ToolSet | undefined {
  if (!tools || Object.keys(tools).length === 0) return undefined;
  // Raycast executes tools itself and sends their results on the next request.
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
