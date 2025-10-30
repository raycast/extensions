import { AI, getPreferenceValues } from "@raycast/api";

type Input = {
  /**
   * The Providers to use for the AI.
   * Available Providers:
   * - OpenAI
   * - Anthropic
   * - Google
   * - DeepSeek
   * - xAI
   * - Mistral
   * - Perplexity
   * - Llama
   */
  providers: string[];
  /**
   * The prompt to ask the AI.
   */
  prompt: string;
};

const getModel = (provider: string) => {
  const preferences = getPreferenceValues<Preferences>();
  switch (provider) {
    case "OpenAI":
      return AI.Model[preferences.openaiModel];
    case "Anthropic":
      return AI.Model[preferences.anthropicModel];
    case "Google":
      return AI.Model[preferences.googleModel];
    case "DeepSeek":
      return AI.Model[preferences.deepseekModel];
    case "xAI":
      return AI.Model[preferences.xaiModel];
    case "Mistral":
      return AI.Model[preferences.mistralModel];
    case "Perplexity":
      return AI.Model[preferences.perplexityModel];
    case "Llama":
      return AI.Model[preferences.llamaModel];
    default:
      return null;
  }
};

export default async function tool(input: Input) {
  const models = input.providers.map(getModel);
  if (models.some((model) => !model)) {
    return {
      error: "Invalid provider in input",
    };
  }

  const responses = await Promise.allSettled(
    models.map(async (model) => {
      return {
        provider: model,
        response: await AI.ask(input.prompt, {
          model: model as AI.Model,
        }),
      };
    }),
  );

  const successfulResponses = responses
    .filter((response) => response.status === "fulfilled")
    .map((response) => response.value);
  const failedResponses = responses.filter((response) => response.status === "rejected");

  return {
    successfulResponses,
    failedResponses,
  };
}
