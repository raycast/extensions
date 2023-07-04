import { History } from "../hooks";

function generateLegalContent(content: string) {
  // legalization code block
  if ((content.match(/```/gm)?.length ?? 0) % 2 === 1) {
    content = content.concat("\n```");
  }

  return content;
}

export function formatContent(histories: History[]) {
  const content = histories.map((item) => `> ${item.prompt}\n\n` + `${generateLegalContent(item.content)}\n`).join("");

  return content;
}
