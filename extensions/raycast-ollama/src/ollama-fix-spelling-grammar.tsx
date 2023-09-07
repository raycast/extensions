import { ResultView } from "./api/main";
import { getPreferenceValues } from "@raycast/api";
import { OllamaApiGenerateRequestBody } from "./api/types";

const preferences = getPreferenceValues();

export default function Command(): JSX.Element {
  const body = {
    model: preferences.ollamaFixSpellingGrammar,
    prompt: "",
    system:
      "Act as a writer. Fix the following text from spelling and grammar error.\n\nOutput only with the fixed text.\n",
  } as OllamaApiGenerateRequestBody;

  return ResultView(body, true);
}
