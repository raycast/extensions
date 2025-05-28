import { AnswerView } from "./lib/ui/AnswerView/main";
import { Preferences, RaycastArgumentsOllamaCommandTranslate } from "./lib/types";
import { CommandAnswer } from "./lib/settings/enum";
import { getPreferenceValues } from "@raycast/api";
import { Creativity } from "./lib/enum";
import { OllamaApiModelCapability } from "./lib/ollama/enum";

const pref = getPreferenceValues<Preferences>();
if (!pref.ollamaCertificateValidation) process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

export default function Command(props: RaycastArgumentsOllamaCommandTranslate): JSX.Element {
  const c = CommandAnswer.TRANSLATE;
  const p = `Translate the text in ${props.arguments.language}.

Text: {selection}

Translation:`;
  return (
    <AnswerView
      command={c}
      prompt={p}
      creativity={Creativity.Low}
      capabilities={[OllamaApiModelCapability.COMPLETION]}
    />
  );
}
