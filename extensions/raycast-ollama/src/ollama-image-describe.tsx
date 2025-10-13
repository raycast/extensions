import { getPreferenceValues } from "@raycast/api";
import { Creativity } from "./lib/enum";
import { OllamaApiModelCapability } from "./lib/ollama/enum";
import { CommandAnswer } from "./lib/settings/enum";
import { Preferences } from "./lib/types";
import { AnswerView } from "./lib/ui/AnswerView/main";

const pref = getPreferenceValues<Preferences>();
if (!pref.ollamaCertificateValidation) process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

export default function Command(): JSX.Element {
  const c = CommandAnswer.IMAGE_DESCRIBE;
  const p = "Describe the content on the following images. {image}\n";
  return (
    <AnswerView command={c} prompt={p} creativity={Creativity.Low} capabilities={[OllamaApiModelCapability.VISION]} />
  );
}
