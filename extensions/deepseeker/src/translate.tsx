import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

const prompt = getPreferenceValues().prompt_translate;
const isLookup = getPreferenceValues().lookup;
const firstLanguage = getPreferenceValues().first_language;
const secondLanguage = getPreferenceValues().second_language;
const modelOverride = getPreferenceValues().model_translate;
const toastTitle = "Translating...";

const instructionTarget = `You target language is ${secondLanguage} only if the provided text is in ${firstLanguage}. Otherwise, the target language is ${firstLanguage}.`;
let instructionLookup = `If the provided text is a single word, then return concise dictionary looking up result in TARGET language (e.g. IPA, definition, examples). Otherwise (e.g. a sentence, paragraphs), only return translated text.`;
instructionLookup = isLookup ? instructionLookup : "";
const instruction = `${instructionTarget}\n\n${instructionLookup}\n\n${prompt}:`;

export default function Translate() {
  return ResultView(instruction, modelOverride, toastTitle, true);
}
