import { showHUD, Clipboard, getSelectedText, LaunchProps } from "@raycast/api";

const subscriptMap: Record<string, string> = {
  "0": "₀",
  "1": "₁",
  "2": "₂",
  "3": "₃",
  "4": "₄",

  "5": "₅",
  "6": "₆",
  "7": "₇",
  "8": "₈",
  "9": "₉",

  a: "ₐ",
  b: "₆",
  c: "꜀",
  d: "ₔ",
  e: "ₑ",

  f: "բ",
  g: "₉",
  h: "ₕ",
  i: "ᵢ",
  j: "ⱼ",

  k: "ₖ",
  l: "ₗ",
  m: "ₘ",
  n: "ₙ",
  o: "ₒ",

  p: "ₚ",
  q: "q",
  r: "ᵣ",
  s: "ₛ",
  t: "ₜ",

  u: "ᵤ",
  v: "ᵥ",
  w: "ᵥᵥ",
  x: "ₓ",
  y: "ᵧ",

  z: "₂",
  A: "ₐ",
  B: "₈",
  C: "C",
  D: "D",

  E: "ₑ",
  F: "բ",
  G: "G",
  H: "ₕ",
  I: "ᵢ",

  J: "ⱼ",
  K: "ₖ",
  L: "ₗ",
  M: "ₘ",
  N: "ₙ",

  O: "ₒ",
  P: "ₚ",
  Q: "Q",
  R: "ᵣ",
  S: "ₛ",

  T: "ₜ",
  U: "ᵤ",
  V: "ᵥ",
  W: "ᵥᵥ",
  X: "ₓ",

  Y: "ᵧ",
  Z: "Z",
  "+": "₊",
  "-": "₋",
  "=": "₌",

  "(": "₍",
  ")": "₎",
};

function toSubscript(text: string): string {
  return text
    .split("")
    .map((char) => subscriptMap[char.toLowerCase()] || char)
    .join("");
}

interface Arguments {
  text?: string;
}

export default async function main(props: LaunchProps<{ arguments: Arguments }>) {
  try {
    let text = props.arguments.text;

    if (!text) {
      try {
        text = await getSelectedText();
      } catch (_error) {
        console.error("Failed to get selected text:", _error);
        await showHUD("No text selected or provided");
        return;
      }
    }

    if (!text || text.trim() === "") {
      await showHUD("No text selected or provided");
      return;
    }

    const subscriptText = toSubscript(text);
    await Clipboard.copy(subscriptText);

    await showHUD(`Copied subscript text to clipboard: ${subscriptText}`);
  } catch (_error) {
    console.error("Error converting text to subscript:", _error);
    await showHUD("Error converting text to subscript");
  }
}
