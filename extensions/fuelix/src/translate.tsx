import { getPreferenceValues, LaunchProps } from "@raycast/api";
import useFuelIX from "./api/useFuelIX";

export default function Translate(props: LaunchProps<{ arguments: Arguments.Translate }>) {
  // we allow user to override the prompt of translation
  const { TranslateLanguage } = props["arguments"];
  const { prompt, defaultTargetLanguage, secondTargetLanguage } = getPreferenceValues();
  const prompts = TranslateLanguage
    ? `Translate following text to ${TranslateLanguage}. ` + prompt
    : `If the following text is in ${defaultTargetLanguage} then translate it to ${secondTargetLanguage}, otherwise Translate following text to ${defaultTargetLanguage}. ` +
      prompt;

  return useFuelIX({
    context: prompts,
    allowPaste: true,
    useSelected: true,
  });
}
