import { List } from "@raycast/api";
import { WordExplanation } from "../types";

interface WordDetailProps {
  word: WordExplanation;
}

export function WordDetail({ word }: WordDetailProps) {
  const markdown = `
# ${word.word}
${word.pronunciation ? `\n*/${word.pronunciation}/*` : ""}
${word.definition ? `\n*${word.definition}*` : ""}
${word.chinese ? `\n*${word.chinese}*` : ""}
${word.example_en ? `\n> _${word.example_en}_` : ""}
${word.example_zh ? `\n> _${word.example_zh}_` : ""}
${word.tip ? `\n💡*${word.tip}*` : ""}
`;

  return <List.Item.Detail markdown={markdown} />;
}
