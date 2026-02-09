import { AnswerView } from "./lib/ui/AnswerView/main";
import { Preferences, RaycastArgumentsOllamaCommandTranslate } from "./lib/types";
import { CommandAnswer } from "./lib/settings/enum";
import { getPreferenceValues } from "@raycast/api";
import { Creativity } from "./lib/enum";
import { OllamaApiModelCapability } from "./lib/ollama/enum";

const pref = getPreferenceValues<Preferences>();
if (!pref.ollamaCertificateValidation) process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

export default function Command(props: RaycastArgumentsOllamaCommandTranslate): React.JSX.Element {
  const c = CommandAnswer.TRANSLATE;
  const p = `You are a professional ${props.arguments.source} to ${props.arguments.target} translator. Your goal is to accurately convey the meaning and nuances of the original ${props.arguments.source} text while adhering to ${props.arguments.target} grammar, vocabulary, and cultural sensitivities.
Produce only the ${props.arguments.target} translation, without any additional explanations or commentary. Please translate the following ${props.arguments.source} text into ${props.arguments.target}:


{selection}`;
  return (
    <AnswerView
      command={c}
      prompt={p}
      creativity={Creativity.Low}
      capabilities={[OllamaApiModelCapability.COMPLETION]}
    />
  );
}
