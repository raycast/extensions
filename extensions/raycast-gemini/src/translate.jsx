import useGemini from "./api/gemini";
import { getPreferenceValues } from "@raycast/api";

export default function Translate(props) {
  // we allow user to override the prompt of translation
  const { TranslateLanguage } = props["arguments"];
  let { prompt, defaultTargetLanguage } = getPreferenceValues();
  const targetLanguage = TranslateLanguage || defaultTargetLanguage;
  prompt = prompt.replace("{targetLanguage}", targetLanguage);

  return useGemini(props, {
    context: prompt,
    allowPaste: true,
    useSelected: true,
  });
}
