import useGemini from "./api/gemini";
import { getPreferenceValues } from "@raycast/api";

export default function Translate(props) {
  // we allow user to override the prompt of translation
  const { TranslateLanguage } = props["arguments"];
  let { prompt } = getPreferenceValues();
  if (!TranslateLanguage) {
    prompt = prompt + "The Target Language is English";
  }
  if (TranslateLanguage) {
    prompt = prompt + "The Target Language is " + TranslateLanguage;
  }

  return useGemini(props, {
    context: prompt,
    allowPaste: true,
  });
}
