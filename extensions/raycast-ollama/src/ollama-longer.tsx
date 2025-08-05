import { getPreferenceValues } from "@raycast/api";
import { Creativity } from "./lib/enum";
import { OllamaApiModelCapability } from "./lib/ollama/enum";
import { CommandAnswer } from "./lib/settings/enum";
import { Preferences } from "./lib/types";
import { AnswerView } from "./lib/ui/AnswerView/main";

const pref = getPreferenceValues<Preferences>();
if (!pref.ollamaCertificateValidation) process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

export default function Command(): JSX.Element {
  const c = CommandAnswer.LONGER;
  const p = `Act as a professional content writer tasked with expanding a client's text while maintaining its essence and style. (replyWithRewrittenText)

Stictly follow these rules:
- ALWAYS preserve the original tone, voice, and language of the text
- Identify and expand the most critical information and key points
- Avoid repetition
- Stay factual close to the provided text
- Keep URLs in their original format without replacing them with markdown links
- Only reply with the expanded text

Text: {selection}

Expanded text:`;
  return (
    <AnswerView
      command={c}
      prompt={p}
      creativity={Creativity.Low}
      capabilities={[OllamaApiModelCapability.COMPLETION]}
    />
  );
}
