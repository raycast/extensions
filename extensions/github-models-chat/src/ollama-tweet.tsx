import { Creativity } from "./lib/enum";
import { OllamaApiModelCapability } from "./lib/ollama/enum";
import { CommandAnswer } from "./lib/settings/enum";
import { AnswerView } from "./lib/ui/AnswerView/main";

export default function Command(): JSX.Element {
  const c = CommandAnswer.TWEET;
  const p = `Act as a social media rewriter for Twitter/X. (replyWithTweet)

Strictly follow these rules:
- Keep the message concise and engaging
- Use a clear and compelling tone
- Avoid hashtags and emojis unless essential
- Keep it under 280 characters
- (maintainURLs)
- (maintainOriginalLanguage)

Text: {selection}

Tweet:`;
  return (
    <AnswerView
      command={c}
      prompt={p}
      creativity={Creativity.Low}
      capabilities={[OllamaApiModelCapability.COMPLETION]}
    />
  );
}
