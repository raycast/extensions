import { getPreferenceValues } from "@raycast/api";
import useGemini from "./api/gemini";

export default function Translate(props) {
  // we allow user to override the prompt of translation
  const { forceLanguage } = props["arguments"];
  let { prompt, firstTargetLanguage, secondTargetLanguage } = getPreferenceValues();
  let prompts = forceLanguage
    ? `Translate following text to ${forceLanguage}. ` + prompt
    : `If the following text is in ${firstTargetLanguage} then translate it to ${secondTargetLanguage}, otherwise Translate following text to ${firstTargetLanguage}. ` +
      prompt;

  return useGemini(props, {
    context: prompts,
    allowPaste: true,
    useSelected: true,
  });
}
