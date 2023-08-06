import ResultView from "./api/main";
import { GetPrompt } from "./api/prompt";
import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues();

export default function Command(): JSX.Element {
  const prompt = GetPrompt(preferences.ollamaFriendlyModel, "ollama-friendly", "");

  return ResultView(preferences.ollamaFriendlyModel, prompt.prompt, prompt.tagEnd, true);
}
