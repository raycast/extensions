import { Creativity } from "./lib/enum";
import { AnswerView } from "./lib/ui/AnswerView/main";
import { CommandAnswer } from "./lib/settings/enum";

export default function Command(): JSX.Element {
  const p = `Explain the selected code step by step.

Rules:
- Explain what the code does in plain language
- Break it down into small steps
- Highlight key functions, data structures, and control flow
- Point out potential pitfalls or improvements
- Keep it concise and accurate

Code:
{selection}

Explanation:`;
  return <AnswerView command={CommandAnswer.CODE_EXPLAIN} prompt={p} creativity={Creativity.Low} />;
}
