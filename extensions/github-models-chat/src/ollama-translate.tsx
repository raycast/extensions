import { Creativity } from "./lib/enum";
import { AnswerView } from "./lib/ui/AnswerView/main";
import { CommandAnswer } from "./lib/settings/enum";

export default function Command({ arguments: { language } }: { arguments: { language: string } }): JSX.Element {
  const p = `Translate the following text to ${language}. Maintain meaning, tone and URLs.

Text: {selection}

Translation:`;
  return <AnswerView command={CommandAnswer.TRANSLATE} prompt={p} creativity={Creativity.Low} />;
}
