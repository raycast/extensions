import { AnswerView } from "./lib/ui/AnswerView/main";
import { CommandAnswer } from "./lib/settings/enum";
import { getPreferenceValues, LaunchProps } from "@raycast/api";
import { Creativity } from "./lib/enum";
import { OllamaApiModelCapability } from "./lib/ollama/enum";

const pref = getPreferenceValues<Preferences>();
if (!pref.ollamaCertificateValidation) process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

export default function Command(props: LaunchProps<{ arguments: Arguments.OllamaTranslate }>): React.JSX.Element {
  const c = CommandAnswer.TRANSLATE;
  const p = `You are a professional {source} to {target} translator. Your goal is to accurately convey the meaning and nuances of the original {source} text while adhering to {target} grammar, vocabulary, and cultural sensitivities.
Produce only the {target} translation, without any additional explanations or commentary. Please translate the following {source} text into {target}:


{selection}`;
  return (
    <AnswerView
      command={c}
      prompt={p}
      promptValues={{
        source: props.arguments.source,
        target: props.arguments.target,
      }}
      creativity={Creativity.Low}
      capabilities={[OllamaApiModelCapability.COMPLETION]}
    />
  );
}
