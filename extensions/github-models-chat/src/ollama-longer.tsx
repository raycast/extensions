import { Creativity } from "./lib/enum";
import { OllamaApiModelCapability } from "./lib/ollama/enum";
import { CommandAnswer } from "./lib/settings/enum";
import { AnswerView } from "./lib/ui/AnswerView/main";

export default function Command(): JSX.Element {
  const c = CommandAnswer.LONGER;
  const p = `Act as a content expander and detail enhancer. (replyWithExpandedText)

Strictly follow these rules:
- Expand the content while maintaining coherence
- Add relevant details, examples, or explanations
- Retain the original meaning and tone
- Keep length only moderately increased
- (maintainURLs)
- (maintainOriginalLanguage)

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
