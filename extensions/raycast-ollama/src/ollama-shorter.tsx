import ResultView from "./api/main";
import { GetPrompt } from "./api/prompt";
import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues();

export default function Command(): JSX.Element {
  const prompt = GetPrompt(preferences.ollamaShorterModel, "ollama-shorter", "");

  return ResultView(preferences.ollamaShorterModel, prompt.prompt, prompt.tagEnd, true);
}
