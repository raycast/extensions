import { Creativity } from "./lib/enum";
import { AnswerView } from "./lib/ui/AnswerView/main";
import { CommandAnswer } from "./lib/settings/enum";

export default function Command(): JSX.Element {
  const p = `Act as a proofreader and grammar corrector. (replyWithCorrectedText)

Strictly follow these rules:
- Correct spelling, grammar, and punctuation errors
- Preserve the original meaning and tone
- Improve clarity when necessary
- Keep length retained
- (maintainURLs)
- (maintainOriginalLanguage)

Text: {selection}

Corrected text:`;
  return <AnswerView command={CommandAnswer.FIX} prompt={p} creativity={Creativity.Low} />;
}
