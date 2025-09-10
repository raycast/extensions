import { Creativity } from "./lib/enum";
import { OllamaApiModelCapability } from "./lib/ollama/enum";
import { CommandAnswer } from "./lib/settings/enum";
import { AnswerView } from "./lib/ui/AnswerView/main";

export default function Command(): JSX.Element {
  const c = CommandAnswer.CONFIDENT;
  const p = `Act as a content writer and editor. (replyWithRewrittenText)

Strictly follow these rules:
- Confident and persuasive tone of voice
- Use clear and assertive language
- Correct spelling, grammar, and punctuation
- Keep meaning unchanged
- Keep length retained
- (maintainURLs)
- (maintainOriginalLanguage)

Text: {selection}

Rewritten text:`;
  return (
    <AnswerView
      command={c}
      prompt={p}
      creativity={Creativity.Low}
      capabilities={[OllamaApiModelCapability.COMPLETION]}
    />
  );
}
