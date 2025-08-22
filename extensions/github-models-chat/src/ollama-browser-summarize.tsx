import { OllamaApiModelCapability } from "./lib/ollama/enum";
import { CommandAnswer } from "./lib/settings/enum";
import { AnswerView } from "./lib/ui/AnswerView/main";

export default function Command(): JSX.Element {
  const p = `Summarize the provided website with the following format:
"""
## <concise and easy-to-read website title>

<one to two sentence summary with the most important information>

### Key Takeaways

- <EXACTLY three bullet points with the key takeaways, keep the bullet points as short as possible>
"""

Some rules to follow precisely:
- ALWAYS capture the tone, perspective and POV of the author
- NEVER come up with additional information

Here's the website information:
{browser-tab}`;
  return <AnswerView command={CommandAnswer.TWEET} prompt={p} capabilities={[OllamaApiModelCapability.COMPLETION]} />;
}
