import { Clipboard, showHUD } from "@raycast/api";

const LETTER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGIT = "0123456789";

function random(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function generateCodename(): string {
  const l1 = LETTER[random(0, LETTER.length - 1)];
  const l2 = LETTER[random(0, LETTER.length - 1)];
  const d1 = DIGIT[random(0, DIGIT.length - 1)];
  const d2 = DIGIT[random(0, DIGIT.length - 1)];
  return `${l1}${l2}-${d1}${d2}`;
}

export default async function Command() {
  const codename = generateCodename();
  await Clipboard.copy(codename);
  await showHUD(`Copied: ${codename}`);
}
