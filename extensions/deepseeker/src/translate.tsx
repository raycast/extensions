import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

export default function Translate() {
  const { prompt_translate, lookup, first_language, second_language, model_translate } = getPreferenceValues();
  const toastTitle = "Translating...";

  const instructionTarget = `Your target language is ${second_language} only if the provided text is in ${first_language}. Otherwise, the target language is ${first_language}.`;
  let instructionLookup = `If the provided text is a single word, then return concise dictionary looking up result in TARGET language (e.g. IPA, definition, examples). Otherwise (e.g. a sentence, paragraphs), only return translated text.`;
  instructionLookup = lookup ? instructionLookup : "";
  const instruction = `${instructionTarget}\n\n${instructionLookup}\n\n${prompt_translate}:`;
  return ResultView(instruction, model_translate, toastTitle, true);
}
