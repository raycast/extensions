import { getPreferenceValues } from "@raycast/api";
import { Creativity } from "./lib/enum";
import { CommandAnswer } from "./lib/settings/enum";
import { Preferences } from "./lib/types";
import { AnswerView } from "./lib/ui/AnswerView/main";

const pref = getPreferenceValues<Preferences>();
if (!pref.ollamaCertificateValidation) process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

export default function Command(): JSX.Element {
  const c = CommandAnswer.CONFIDENT;
  const p = `Act as a content writer and editor. (replyWithRewrittenText)

Strictly follow these rules:
- Use confident, formal and friendly tone of voice
- Avoid hedging, be definite where possible
- Skip apologies
- Focus on main arguments
- Correct spelling, grammar, and punctuation
- Keep meaning unchanged
- Keep length retained
- (maintainURLs)
- (maintainOriginalLanguage)

Text: {selection}

Rewritten text:`;
  return <AnswerView command={c} prompt={p} creativity={Creativity.Low} />;
}
