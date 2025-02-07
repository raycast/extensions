import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

const prompt = getPreferenceValues().prompt_translate;
const is_lookup = getPreferenceValues().lookup;
const first_language = getPreferenceValues().first_language;
const second_language = getPreferenceValues().second_language;
const model_override = getPreferenceValues().model_translate;
const toast_title = "Translating...";

const instruction_target = `You target language is ${second_language} only if the provided text is in ${first_language}. Otherwise, the target language is ${first_language}.`;
let instruction_lookup = `If the provided text is a single word, then return concise dictionary looking up result in TARGET language (e.g. IPA, definition, examples). Otherwise (e.g. a sentence, paragraphs), only return translated text.`;
instruction_lookup = is_lookup ? instruction_lookup : "";
const instruction = `${instruction_target}\n\n${instruction_lookup}\n\n${prompt}:`;

export default function Translate() {
  return ResultView(instruction, model_override, toast_title, true);
}
