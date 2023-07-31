import ResultView from "./api/main";
import { GetPrompt } from "./api/prompt";
import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues();

export default function Command(): JSX.Element {
  const prompt = GetPrompt(preferences.ollamaCodeExplain, "ollama-code-explain", "");

  return ResultView(preferences.ollamaCodeExplain, prompt.prompt, prompt.tagEnd, true);
}
