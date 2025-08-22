import { Creativity } from "./lib/enum";
import { OllamaApiModelCapability } from "./lib/ollama/enum";
import { CommandAnswer } from "./lib/settings/enum";
import { AnswerView } from "./lib/ui/AnswerView/main";

export default function Command(): JSX.Element {
  const c = CommandAnswer.SHORTER;
  const p = `Act as a content condenser and clarity improver. (replyWithShortenedText)

Strictly follow these rules:
- Shorten the text while preserving key meaning
- Improve clarity and readability
- Remove redundancy and filler phrases
- Keep tone and style consistent
- (maintainURLs)
- (maintainOriginalLanguage)

Text: {selection}

Shortened text:`;
  return (
    <AnswerView
      command={c}
      prompt={p}
      creativity={Creativity.Low}
      capabilities={[OllamaApiModelCapability.COMPLETION]}
    />
  );
}
