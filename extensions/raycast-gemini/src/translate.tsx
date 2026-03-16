import { getPreferenceValues, LaunchProps } from "@raycast/api";
import useGemini from "./api/gemini";

interface TranslatePreferences {
  prompt: string;
  defaultTargetLanguage: string;
  secondTargetLanguage: string;
}

export default function Translate(props: LaunchProps<{ arguments: { TranslateLanguage: string } }>) {
  const { TranslateLanguage } = props.arguments;
  const { prompt, defaultTargetLanguage, secondTargetLanguage } = getPreferenceValues<TranslatePreferences>();
  const prompts = TranslateLanguage
    ? `Translate following text to ${TranslateLanguage}. ` + prompt
    : `If the following text is in ${defaultTargetLanguage} then translate it to ${secondTargetLanguage}, otherwise Translate following text to ${defaultTargetLanguage}. ` +
      prompt;

  return useGemini(props, {
    context: prompts,
    allowPaste: true,
    useSelected: true,
  });
}
