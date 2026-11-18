import { MdDefinition } from "../types";

export function getRandomCards(definitions: MdDefinition[], count = 10): MdDefinition[] {
  const shuffled = [...definitions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

export function buildFrontMarkdown(card: MdDefinition): string {
  return `# ${card.text}`;
}

export function buildBackMarkdown(card: MdDefinition): string {
  return `# ${card.text}
${card.pronunciation ? `\n*/${card.pronunciation}/*` : ""}
${card.definition ? `\n*${card.definition}*` : ""}
${card.chinese ? `\n*${card.chinese}*` : ""}
${card.example_en ? `\n> _${card.example_en}_` : ""}
${card.example_zh ? `\n> _${card.example_zh}_` : ""}
${card.tip ? `\n💡*${card.tip}*` : ""}
`;
}
