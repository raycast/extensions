import { useOpenAIStreaming } from "./useOpenAIStreaming";

export function useGenerate(prompt: string) {
  return useOpenAIStreaming(prompt, !!prompt);

  // Note: Currently only supporting OpenAI API key due to Raycast's built-in AI usage limitations

  // const preferences = getPreferenceValues<Preferences>();
  // if (preferences.openAIApiKey) {
  //   return useOpenAIStreaming(prompt, !!prompt);
  // } else {
  //   return useAI(prompt, {
  //     model: AI.Model["OpenAI_GPT4o-mini"],
  //     execute: !!prompt,
  //     creativity: "none",
  //   });
  // }
}
