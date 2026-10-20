import { createClient, getExtensionPreferences } from "../lib/raycast";
import { getDefaultChatModelKey, preferredModel } from "../lib/use-models";

type Input = {
  /** The complete question or instruction to send to the user's local language model. */
  prompt: string;
};

/** Ask the user's default local LM Studio language model without saving server-side chat state. */
export default async function askLocalModel(input: Input) {
  const prompt = input.prompt.trim();
  if (!prompt) throw new Error("Provide a non-empty prompt for the local model.");

  const client = createClient();
  const [availableModels, defaultModelKey] = await Promise.all([client.listModels(), getDefaultChatModelKey()]);
  const models = availableModels.filter((model) => model.type === "llm");
  const model = preferredModel(models, defaultModelKey);
  if (!model) {
    throw new Error("No language model is available. Download a model in LM Studio and start its local server.");
  }

  const preferences = getExtensionPreferences();
  const result = await client.chat({
    model: model.key,
    input: prompt,
    systemPrompt: preferences.systemPrompt?.trim() || undefined,
    store: false,
  });
  if (!result.text.trim()) throw new Error("The local model returned an empty answer.");
  return result.text;
}
