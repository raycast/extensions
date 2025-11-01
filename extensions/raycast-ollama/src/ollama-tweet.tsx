import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "./lib/types";
import { Creativity } from "./lib/enum";
import { CommandAnswer } from "./lib/settings/enum";
import { AnswerView } from "./lib/ui/AnswerView/main";
import { OllamaApiModelCapability } from "./lib/ollama/enum";

const pref = getPreferenceValues<Preferences>();
if (!pref.ollamaCertificateValidation) process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

export default function Command(): JSX.Element {
  const c = CommandAnswer.TWEET;
  const p = `You're an expert in the field and have the perfect opportunity to share your ideas and insights with a huge audience!. Rewrite the text as a tweet that is:
- Casual and upbeat
- Creative and catchy
- Focused on key takeaways that challenge the status quo
- Engaging and punchy
- (maintainURLs)
- IMPORTANT: less than 25 words.
- IMPORTANT: doesn't include hash, hashtags and words starting with #, i.e. #innovation #Technology
- (maintainOriginalLanguage)

Text:
The concept of Rayday is simple. Every Friday, everyone can use the day to work on something that benefits Raycast. From new features, to fixing bugs, drafting documentation or tidying up, it’s time for us to take a break from project work. As well as getting creative with our own ideas, it’s a great chance to act on feedback from our users and community too.

Tweet:
⚒️ We hack every Friday – we call it 'Rayday'. Everyone can use the day to work on something that benefits Raycast – aside from normal project work.

Text: {selection}

Tweet:`;
  return (
    <AnswerView
      command={c}
      prompt={p}
      creativity={Creativity.High}
      capabilities={[OllamaApiModelCapability.COMPLETION]}
    />
  );
}
