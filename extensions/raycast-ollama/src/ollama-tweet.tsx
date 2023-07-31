import ResultView from "./api/main";
import { GetPrompt } from "./api/prompt";
import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues();

export default function Command(): JSX.Element {
  const prompt = GetPrompt(preferences.ollamaCasualModel, "ollama-tweet", "");

  return ResultView(preferences.ollamaCasualModel, prompt.prompt, prompt.tagEnd, true);
}
