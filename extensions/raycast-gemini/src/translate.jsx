import { getPreferenceValues } from "@raycast/api";
import useGemini from "./api/gemini";

export default function Translate(props) {
  // we allow user to override the prompt of translation
  const { TranslateLanguage } = props["arguments"];
  let { prompt, defaultTargetLanguage, secondTargetLanguage } = getPreferenceValues();
  let prompts = TranslateLanguage
    ? `Translate following text to ${TranslateLanguage}. ` + prompt
    : `If the following text is in ${defaultTargetLanguage} then translate it to ${secondTargetLanguage}, otherwise Translate following text to ${defaultTargetLanguage}. ` +
      prompt;

  return useGemini(props, {
    context: prompts,
    allowPaste: true,
    useSelected: true,
  });
}
