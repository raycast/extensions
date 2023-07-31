import ResultView from "./api/main";
import { GetPrompt } from "./api/prompt";
import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues();

export default function Command(): JSX.Element {
  const prompt = GetPrompt(preferences.ollamaFixSpellingGrammar, "ollama-fix-spelling-grammar", "");

  return ResultView(preferences.ollamaFixSpellingGrammar, prompt.prompt, prompt.tagEnd, true);
}
