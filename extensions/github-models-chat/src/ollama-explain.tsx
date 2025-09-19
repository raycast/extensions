import { Creativity } from "./lib/enum";
import { OllamaApiModelCapability } from "./lib/ollama/enum";
import { CommandAnswer } from "./lib/settings/enum";
import { AnswerView } from "./lib/ui/AnswerView/main";

export default function Command(): JSX.Element {
  const c = CommandAnswer.EXPLAIN;
  const p = `Act as a dictionary and encyclopedia, providing clear and concise explanations for given words or concepts.

Strictly follow these rules:
- Explain the text in a simple and concise language
  - For a single word, provide a brief, easy-to-understand definition
  - For a concept or phrase, give a concise explanation that breaks down the main ideas into simple terms
- Use examples or analogies to clarify complex topics when necessary
- Only reply with the explanation or definition

Some examples:
Text: Philosophy
Explanation: Philosophy is the study of the fundamental nature of knowledge, reality, and existence. It is a system of ideas that attempts to explain the world and our place in it. Philosophers use logic and reason to explore the meaning of life and the universe.

Text: {selection}

Explanation:`;
  return (
    <AnswerView
      command={c}
      prompt={p}
      creativity={Creativity.Low}
      capabilities={[OllamaApiModelCapability.COMPLETION]}
    />
  );
}
