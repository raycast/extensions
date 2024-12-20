import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../summarizeVideo";
import { useAnthropicFollowUpQuestion } from "./anthropic/useAnthropicFollowUpQuestion";
import { useOpenAIFollowUpQuestion } from "./openai/useOpenAIFollowUpQuestion";
import { useRaycastAIFollowUpQuestion } from "./raycast/useRaycastAIFollowUpQuestion";

export const useFollowUpQuestion = async (
  question: string,
  transcript: string,
  setSummary: React.Dispatch<React.SetStateAction<string | undefined>>,
  pop: () => void,
) => {
  const preferences = getPreferenceValues() as Preferences;
  const { chosenAi } = preferences;
  setSummary(undefined);

  switch (chosenAi) {
    case "anthropic":
      useAnthropicFollowUpQuestion(question, transcript, setSummary, pop);
      break;
    case "openai":
      useOpenAIFollowUpQuestion(question, transcript, setSummary, pop);
      break;
    case "raycastai":
      useRaycastAIFollowUpQuestion(question, transcript, setSummary, pop);
      break;
    default:
      return;
  }
};
