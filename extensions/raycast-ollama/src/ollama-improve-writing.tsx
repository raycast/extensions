import ResultView from "./api/main";
import { GetPrompt } from "./api/prompt";
import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues();

export default function Command(): JSX.Element {
  const prompt = GetPrompt(preferences.ollamaImproveWriting, "ollama-improve-writing", "");

  return ResultView(preferences.ollamaImproveWriting, prompt.prompt, prompt.tagEnd, true);
}
